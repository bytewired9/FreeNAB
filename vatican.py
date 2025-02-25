import os
import time
import requests
from bs4 import BeautifulSoup, Comment, NavigableString

def get_soup(url):
    while True:
        try:
            response = requests.get(url)
            response.raise_for_status()
            return BeautifulSoup(response.text, 'html.parser')
        except Exception as e:
            print(f"Request to {url} failed: {e}. Retrying in 5 seconds...")
            time.sleep(5)

def process_footnotes(soup):
    """
    For any <a> tag within a <sup> element, if its text is an integer (positive or negative)
    and its href starts with '#', replace it with that integer wrapped in square brackets.
    """
    for a in soup.find_all('a'):
        if a.find_parent('sup'):
            text = a.get_text(strip=True)
            try:
                int(text)  # will raise ValueError if not an integer
                href = a.get('href', '')
                if href.startswith('#'):
                    a.replace_with(NavigableString(f"[{text}]"))
            except ValueError:
                continue

def clean_file_text(lines, original_book_name):
    """
    Removes unwanted header lines and blank lines from the page's text.
    """
    excluded_full_matches = {
        "",
        "Help",
        "-",
        "2002 11 11",
        "IntraText - Text",
        "Click here to show the links to concordance",
        "Previous",
        "Next",
        "The New American Bible - IntraText",
        "Copyright © Libreria Editrice Vaticana"
    }
    excluded_startswith = [
        "Chapter ",
    ]
    excluded_equals = [
        "New  American Bible",
        "The Pentateuch",
        "The Historical Books",
        "The Wisdom Books",
        "The Prophetic Books",
        "The Gospels",
        "New Testament Letters",
        "The Catholic Letters",
        original_book_name,  # remove line matching the book name exactly
    ]
    
    cleaned = []
    for line in lines:
        text = line.strip()
        if text in excluded_full_matches:
            continue
        if any(text.startswith(prefix) for prefix in excluded_startswith):
            continue
        if text in excluded_equals:
            continue
        if not text:
            continue
        cleaned.append(line)
    return cleaned

def extract_chapter_ul(bf):
    """
    For a given <font size="2"> element (book title), try to extract a <ul> element that
    contains chapter links. First check for a visible sibling; if not found, look for HTML comments.
    """
    sibling_ul = bf.find_next_sibling("ul")
    if sibling_ul:
        return sibling_ul

    # If not found, check the parent <li> for comment nodes.
    parent_li = bf.find_parent("li")
    if parent_li:
        for child in parent_li.contents:
            if isinstance(child, Comment):
                # Parse the comment as HTML.
                comment_soup = BeautifulSoup(child, 'html.parser')
                ul = comment_soup.find("ul")
                if ul:
                    return ul
    return None

def scrape_nabre():
    INDEX_URL = "https://www.vatican.va/archive/ENG0839/_INDEX.HTM"
    BASE_URL = "https://www.vatican.va/archive/ENG0839/"

    index_soup = get_soup(INDEX_URL)

    # Dictionary mapping safe book name -> list of (chapter_label, link)
    books_links = {}

    # Books are usually in <li><font size="2"> elements.
    all_book_fonts = index_soup.select("li > font[size='2']")

    for bf in all_book_fonts:
        original_book_name = bf.get_text(strip=True)
        safe_book_name = original_book_name.replace(" ", "_")
        books_links[safe_book_name] = []

        # Check for a direct link in case of a single-chapter book.
        direct_anchor = bf.find('a', href=True)
        if direct_anchor and direct_anchor['href'].endswith('.HTM'):
            label = direct_anchor.get_text(strip=True)
            books_links[safe_book_name].append((label, direct_anchor['href']))

        # Look for a chapter list either in a sibling <ul> or in an HTML comment.
        chapter_ul = extract_chapter_ul(bf)
        if chapter_ul:
            chapter_anchors = chapter_ul.find_all('a', href=True)
            for a in chapter_anchors:
                href = a['href']
                if href.endswith('.HTM'):
                    label = a.get_text(strip=True)
                    books_links[safe_book_name].append((label, href))

    # Create main output directory
    if not os.path.exists("nabre_books"):
        os.makedirs("nabre_books")

    for safe_book_name, chapters in books_links.items():
        if not chapters:
            continue

        original_book_name = safe_book_name.replace("_", " ")
        book_folder = os.path.join("./public/nabre_books", safe_book_name)
        if not os.path.exists(book_folder):
            os.makedirs(book_folder)

        for i, (chapter_label, link) in enumerate(chapters, start=1):
            page_url = BASE_URL + link
            try:
                page_soup = get_soup(page_url)
                # Replace footnote links as needed.
                process_footnotes(page_soup)
                
                # Extract text lines and clean unwanted header lines.
                raw_lines = page_soup.get_text(separator='\n').split('\n')
                filtered_lines = clean_file_text(raw_lines, original_book_name)
                final_text = "\n".join(filtered_lines).lstrip('\n')
                
                file_chapter = chapter_label if chapter_label else str(i)
                filename = f"{safe_book_name}_{file_chapter}.txt"
                output_path = os.path.join(book_folder, filename)
                
                with open(output_path, "w", encoding="utf-8") as f:
                    f.write(final_text)
                
                print(f"[{original_book_name}] Saved: {filename}")
            except Exception as e:
                print(f"Failed to scrape {safe_book_name} - {link}: {e}")

if __name__ == "__main__":
    scrape_nabre()
