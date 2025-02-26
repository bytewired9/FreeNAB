// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// types.ts (or near the top of main.tsx)
interface ManifestChapter {
  filename: string;
  char_count: number;
}
type ManifestType = { [book: string]: ManifestChapter[] };

interface FlatManifestItem {
  book: string;
  filename: string;
  char_count: number;
}

interface VirtualPage {
  chapterIndex: number;
  pageIndex: number;
  globalPageIndex: number;
  book: string;
  fileName: string;
  char_count: number;
  // content remains empty until the chapter is loaded
  content: string;
}


interface BookPage {
  folder: string;
  fileName: string;
  content: string;
}

interface RenderedPage {
  folder: string;
  fileName: string;
  content: string;
  chapterIndex: number;
  pageIndex: number;
}

interface ChapterMapping {
  chapterIndex: number;
  globalPageIndex: number;
  folder: string;
  fileName: string;
}

function paginateContent(content: string, charsPerPage: number): string[] {
  const words = content.split(' ');
  const pages: string[] = [];
  let currentPage = '';
  for (const word of words) {
    if (currentPage.length + word.length + 1 > charsPerPage) {
      pages.push(currentPage);
      currentPage = word;
    } else {
      currentPage += (currentPage.length ? ' ' : '') + word;
    }
  }
  if (currentPage) pages.push(currentPage);
  return pages;
}

/**
 * Convert "[123]" => <sup>123</sup>.
 */
function parseTextContent(text: string): React.ReactNode[] {
  const regex = /\[(\d+)\]/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    parts.push(<sup key={key++}>{match[1]}</sup>);
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  return parts;
}

function Page({ page, isMobile }: { page: RenderedPage; isMobile: boolean }) {
  const parsedContent = parseTextContent(page.content);
  return (
    <div
      className="bg-white shadow-md rounded-md overflow-hidden"
      style={{ width: '6in', height: '9in' }}
    >
      <div className="flex flex-col h-full">
        <div className="text-center text-sm p-2 border-b border-gray-200 bg-gray-50">
          {page.fileName}
        </div>
        <div
          className={`flex-1 p-4 ${isMobile ? 'columns-1' : 'columns-2'} gap-4 text-base leading-relaxed overflow-auto`}
        >
          {parsedContent}
        </div>
      </div>
    </div>
  );
}

function IndexMenu({
  mapping,
  manifestKeys,
  onSelect,
  onClose,
}: {
  mapping: ChapterMapping[];
  manifestKeys: { book: string; file: string }[];
  onSelect: (chapterIndex: number) => void;
  onClose: () => void;
}) {
  // Build an array of { book: string; chapters: { file: string; index: number }[] }
  const groupedManifest = React.useMemo(() => {
    const groupMap = new Map<string, Array<{ file: string; index: number }>>();
    manifestKeys.forEach(({ book, file }, i) => {
      if (!groupMap.has(book)) {
        groupMap.set(book, []);
      }
      groupMap.get(book)!.push({ file, index: i });
    });

    // Convert the Map to a simpler array of { book, chapters }
    return Array.from(groupMap.entries()).map(([book, chapters]) => ({
      book,
      chapters,
    }));
  }, [manifestKeys]);

  // Keep track of which book is open
  const [openBook, setOpenBook] = React.useState<string | null>(null);

  function toggleBook(book: string) {
    // If the same book is clicked again, close it. Otherwise, open the new one
    setOpenBook((prev) => (prev === book ? null : book));
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-64 bg-white h-full shadow-lg p-4 overflow-auto rounded-r-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Index</h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-red-500 transition-colors"
          >
            &times;
          </button>
        </div>

        <ul className="space-y-2">
          {groupedManifest.map(({ book, chapters }) => (
            <li key={book}>
              {/* Book header, toggles the dropdown */}
              <button
                onClick={() => toggleBook(book)}
                className="w-full text-left font-semibold mb-1 hover:underline"
              >
                {book.replace(/_/g, ' ')}
              </button>

              {/* If the current book is open, render the list of chapters */}
              {openBook === book && (
                <ul className="pl-4 space-y-1">
                  {chapters.map(({ file, index }) => (
                    <li key={file}>
                      <button
                        onClick={() => {
                          onSelect(index);
                          onClose();
                        }}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        {file.replace(/\.txt$/i, '').replace(/_/g, ' ')}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}


function Book({
  pages,
  chapterMapping,
  flatManifest,
  currentPage,
  onPageChange,
  onSelectChapter,
  isMobile,
  ensureNextChapterLoaded,
}: {
  pages: RenderedPage[];
  chapterMapping: ChapterMapping[];
  flatManifest: { book: string; file: string }[];
  currentPage: number;
  onPageChange: (newPage: number) => void;
  onSelectChapter: (bookIndex: number) => void;
  isMobile: boolean;
  ensureNextChapterLoaded: () => void;
}) {
  const [showIndex, setShowIndex] = React.useState(false);

  const pagesPerSpread = isMobile ? 1 : 2;
  const totalPages = pages.length;
  const lastPageIndex = totalPages - pagesPerSpread;

  function goToPrevious() {
    onPageChange(Math.max(currentPage - pagesPerSpread, 0));
  }

  async function goToNext() {
    await ensureNextChapterLoaded();
    onPageChange(Math.min(currentPage + pagesPerSpread, lastPageIndex));
  }

  const leftPage = pages[currentPage];
  const rightPage =
    !isMobile && pages[currentPage + 1] ? pages[currentPage + 1] : null;

  React.useEffect(() => {
    if (!isMobile && leftPage && !rightPage) {
      ensureNextChapterLoaded();
    }
  }, [isMobile, leftPage, rightPage, ensureNextChapterLoaded]);

  let headerBook = leftPage ? leftPage.folder : '';
  if (rightPage && rightPage.folder !== leftPage.folder) {
    headerBook = rightPage.folder;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center py-8">
      <div className="max-w-5xl w-full relative px-4">
        <header className="bg-white/80 backdrop-blur-sm shadow-md rounded-md p-4 mb-4 flex justify-between items-center">
          <button
            onClick={() => setShowIndex(true)}
            className="text-xl md:text-2xl font-semibold text-gray-700 hover:opacity-70 transition-opacity"
          >
            &gt; {headerBook}
          </button>
        </header>

        {showIndex && (
          <IndexMenu
            mapping={chapterMapping}
            manifestKeys={flatManifest}
            onSelect={onSelectChapter}
            onClose={() => setShowIndex(false)}
          />
        )}

        <div className="flex items-stretch justify-center gap-4">
          {leftPage && <Page page={leftPage} isMobile={isMobile} />}
          {!isMobile && rightPage && (
            <>
              <div className="border-l-2 border-gray-300"></div>
              <Page page={rightPage} isMobile={isMobile} />
            </>
          )}
        </div>

        <div className="flex justify-between w-full mt-6">
          <button
            onClick={goToPrevious}
            disabled={currentPage === 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow transition-colors disabled:opacity-60"
          >
            Previous
          </button>
          <button
            onClick={goToNext}
            disabled={currentPage >= lastPageIndex}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow transition-colors disabled:opacity-60"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

// Utility function to abstract file reading
async function readLocalFile(filePath: string): Promise<string> {
  if (window.electronAPI && window.electronAPI.readLocalFile) {
    return await window.electronAPI.readLocalFile(filePath);
  } else {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${filePath}`);
    }
    return await response.text();
  }
}

function App() {
  const [basePath, setBasePath] = React.useState('');
  const [manifest, setManifest] = React.useState<ManifestType | null>(null);
  const [loadingManifest, setLoadingManifest] = React.useState(true);
  const [isMobile, setIsMobile] = React.useState(false);

  // Our chapters state: an array where each index corresponds to a chapter (may be undefined if not loaded yet)
  const [chapters, setChapters] = React.useState<Array<BookPage | undefined>>([]);
  // currentPage is a global page number (across all chapters)
  const [currentPage, setCurrentPage] = React.useState(0);
  const [isFetchingChapter, setIsFetchingChapter] = React.useState(false);

  // Get basePath as before.
  React.useEffect(() => {
    async function fetchBasePath() {
      if (window.electronAPI && window.electronAPI.getBasePath) {
        const path = await window.electronAPI.getBasePath();
        setBasePath(path);
      } else {
        setBasePath('');
      }
    }
    fetchBasePath();
  }, []);

  // Manifest load: now our json has an array of { filename, char_count } per book.
  React.useEffect(() => {
    async function loadManifest() {
      // Use a default path (like '.') if basePath is empty.
      const effectiveBasePath = basePath || '.';
      const filePath = `${effectiveBasePath}/nabre_books/books.json`;
      try {
        const fileContent = await readLocalFile(filePath);
        const data = JSON.parse(fileContent);
        setManifest(data);
      } catch (error) {
        console.error('Failed to load manifest:', error);
      }
      setLoadingManifest(false);
    }
    loadManifest();
  }, [basePath]);


  // Update isMobile on resize.
  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // flatManifest: a simple flattened array from our manifest.
  const flatManifest: FlatManifestItem[] = React.useMemo(() => {
    if (!manifest) return [];
    const list: FlatManifestItem[] = [];
    for (const [book, chapters] of Object.entries(manifest)) {
      for (const chap of chapters) {
        list.push({ book, filename: chap.filename, char_count: chap.char_count });
      }
    }
    return list;
  }, [manifest]);

  // Build virtualPages from the manifest.
  const virtualPages: VirtualPage[] = React.useMemo(() => {
    if (!manifest) return [];
    const charsPerPage = isMobile ? 1300 : 1700;
    let globalPage = 0;
    let chapterIndex = 0;
    const pages: VirtualPage[] = [];
    for (const [book, chapters] of Object.entries(manifest)) {
      for (const chap of chapters) {
        const cleanedFileName = chap.filename.replace(/\.txt$/i, '').replace(/_/g, ' ');
        const numPages = Math.ceil(chap.char_count / charsPerPage);
        for (let i = 0; i < numPages; i++) {
          pages.push({
            chapterIndex,
            pageIndex: i,
            globalPageIndex: globalPage,
            book: book.replace(/_/g, ' '),
            fileName: cleanedFileName,
            char_count: chap.char_count,
            content: '' // will be filled in when the chapter loads
          });
          globalPage++;
        }
        chapterIndex++;
      }
    }
    return pages;
  }, [manifest, isMobile]);



  // renderedPages: combine virtualPages with any loaded chapter content.
  const renderedPages: RenderedPage[] = React.useMemo(() => {
    const charsPerPage = isMobile ? 1300 : 1700;
    return virtualPages.map(vp => {
      const loadedChapter = chapters[vp.chapterIndex];
      const pageContent = loadedChapter
        ? paginateContent(loadedChapter.content, charsPerPage)[vp.pageIndex] || ''
        : '';
      return {
        folder: vp.book, // map the virtual "book" to "folder"
        fileName: vp.fileName,
        content: pageContent,
        chapterIndex: vp.chapterIndex,
        pageIndex: vp.pageIndex
      };
    });
  }, [virtualPages, chapters, isMobile]);


  // chapterMapping: first page for each chapter.
  const chapterMapping: ChapterMapping[] = React.useMemo(() => {
    return virtualPages
      .filter(vp => vp.pageIndex === 0)
      .map(vp => ({
        chapterIndex: vp.chapterIndex,
        globalPageIndex: vp.globalPageIndex,
        folder: vp.book,
        fileName: vp.fileName
      }));
  }, [virtualPages]);

  // Update URL as before.
  function updateUrl(fileName: string, page: number) {
    const params = new URLSearchParams(window.location.search);
    params.set('file', fileName);
    params.set('page', String(page));
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }

  // loadChapterByIndex now uses flatManifest.
  async function loadChapterByIndex(idx: number): Promise<BookPage | null> {
    if (idx < 0 || idx >= flatManifest.length) return null;
    const { book, filename } = flatManifest[idx];
    const filePath = `${basePath}/nabre_books/${book}/${filename}`;
    try {
      const content = await readLocalFile(filePath);
      return {
        folder: book.replace(/_/g, ' '),
        fileName: filename.replace(/\.txt$/i, '').replace(/_/g, ' '),
        content,
      };
    } catch (error) {
      console.error(`Error reading file at ${filePath}`, error);
      return null;
    }
  }

  // When user selects a chapter from the index,
  // we don’t load every chapter in between; we just compute the target page.
  async function handleSelectChapter(chapterIndex: number) {
    if (!chapters[chapterIndex]) {
      setIsFetchingChapter(true);
      const newChap = await loadChapterByIndex(chapterIndex);
      setIsFetchingChapter(false);
      if (newChap) {
        const newChapters = [...chapters];
        newChapters[chapterIndex] = newChap;
        setChapters(newChapters);
      }
    }
    const target = chapterMapping.find(m => m.chapterIndex === chapterIndex);
    if (target) {
      setCurrentPage(target.globalPageIndex);
      updateUrl(flatManifest[chapterIndex].filename.replace(/\.txt$/i, ''), target.globalPageIndex);
    }
  }

  // When the user navigates pages (prev/next), we use our renderedPages.
  async function handlePageChange(newPage: number) {
    if (newPage < 0 || newPage >= virtualPages.length) return;
    setCurrentPage(newPage);
    // Update URL based on the chapter that this page belongs to.
    const vp = virtualPages[newPage];
    if (vp) {
      updateUrl(vp.fileName, newPage);
    }
  }

  // When currentPage changes, if the chapter for that page isn’t loaded, load it on-demand.
  React.useEffect(() => {
    const vp = virtualPages[currentPage];
    if (vp && !chapters[vp.chapterIndex]) {
      (async () => {
        setIsFetchingChapter(true);
        const loadedChap = await loadChapterByIndex(vp.chapterIndex);
        setIsFetchingChapter(false);
        if (loadedChap) {
          const newChapters = [...chapters];
          newChapters[vp.chapterIndex] = loadedChap;
          setChapters(newChapters);
        }
      })();
    }
  }, [currentPage, virtualPages, chapters]);

  React.useEffect(() => {
    if (manifest && virtualPages.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const pageParam = params.get("page");
      const fileParam = params.get("file");
      let targetPage = 0;

      if (pageParam) {
        const parsed = parseInt(pageParam, 10);
        if (!isNaN(parsed)) {
          targetPage = parsed;
        }
      } else if (fileParam) {
        // Convert underscores to spaces so both "Genesis+2" and "Genesis_2" become "Genesis 2"
        const normalizedFileParam = fileParam.replace(/_/g, ' ');
        const mapping = chapterMapping.find(
          (m) =>
            m.fileName.replace(/_/g, ' ').toLowerCase() === normalizedFileParam.toLowerCase()
        );
        if (mapping) {
          targetPage = mapping.globalPageIndex;
        }
      }

      if (targetPage !== currentPage && targetPage >= 0 && targetPage < virtualPages.length) {
        setCurrentPage(targetPage);
      }
    }
  }, [manifest, virtualPages, chapterMapping]);




  if (loadingManifest || !manifest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <span className="text-xl font-medium text-gray-600">Loading manifest...</span>
      </div>
    );
  }

  return (
    <>
      {isFetchingChapter && (
        <div className="fixed top-4 right-4 bg-white text-gray-800 px-3 py-1 rounded-md shadow">
          Loading chapter...
        </div>
      )}
      <Book
        pages={renderedPages}
        chapterMapping={chapterMapping}
        flatManifest={flatManifest.map(item => ({ book: item.book, file: item.filename }))}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onSelectChapter={handleSelectChapter}
        isMobile={isMobile}
        ensureNextChapterLoaded={() => Promise.resolve()} // no-op since we use lazy loading now
      />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
