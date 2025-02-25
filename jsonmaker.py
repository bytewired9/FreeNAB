#!/usr/bin/env python3
import os
import json

def get_creation_time(path):
    """Return the creation time of the file or folder."""
    return os.path.getctime(path)

def count_characters(file_path):
    """Count characters in a file excluding newlines."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        # Remove newline characters and count the remaining characters
        return len(content.replace('\n', ''))
    except Exception as e:
        # If there's an error (e.g., file not accessible), return 0 or handle accordingly
        return 0

def list_nabre_books(directory):
    """
    List folders in the given directory and the files within each folder,
    both sorted by creation time. The returned dictionary maps folder names
    to lists of dictionaries for each file with its name and character count.
    """
    output = {}

    # Get a list of folder names in the directory
    folders = [d for d in os.listdir(directory) if os.path.isdir(os.path.join(directory, d))]
    # Sort folders by creation time
    folders.sort(key=lambda d: get_creation_time(os.path.join(directory, d)))

    for folder in folders:
        folder_path = os.path.join(directory, folder)
        # List only files in this folder (ignoring any subdirectories)
        files = [f for f in os.listdir(folder_path) if os.path.isfile(os.path.join(folder_path, f))]
        # Sort files by creation time
        files.sort(key=lambda f: get_creation_time(os.path.join(folder_path, f)))
        
        # Create a list of dictionaries with file name and character count
        file_info = []
        for f in files:
            file_path = os.path.join(folder_path, f)
            char_count = count_characters(file_path)
            file_info.append({
                "filename": f,
                "char_count": char_count
            })
        
        output[folder] = file_info

    return output

if __name__ == '__main__':
    directory = './public/nabre_books'  # Path to your nabre_books directory
    result = list_nabre_books(directory)
    # Save the JSON output to books.json
    with open('./public/nabre_books/books.json', 'w', encoding='utf-8') as outfile:
        json.dump(result, outfile, indent=4)
