// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';


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

function paginateChapters(chapters: BookPage[], charsPerPage: number): RenderedPage[] {
  const rendered: RenderedPage[] = [];
  chapters.forEach((chap, chapIndex) => {
    const pageContents = paginateContent(chap.content, charsPerPage);
    pageContents.forEach((pageContent, pageIndex) => {
      rendered.push({
        folder: chap.folder,
        fileName: chap.fileName,
        content: pageContent,
        chapterIndex: chapIndex,
        pageIndex,
      });
    });
  });
  return rendered;
}

function getChapterIndexMapping(chapters: BookPage[], pages: RenderedPage[]): ChapterMapping[] {
  const mapping: ChapterMapping[] = [];
  for (let i = 0; i < chapters.length; i++) {
    const globalPageIndex = pages.findIndex((p) => p.chapterIndex === i);
    if (globalPageIndex >= 0) {
      mapping.push({
        chapterIndex: i,
        globalPageIndex,
        folder: chapters[i].folder,
        fileName: chapters[i].fileName,
      });
    }
  }
  return mapping;
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
  manifestKeys,
  onSelect,
  onClose,
}: {
  mapping: ChapterMapping[];
  manifestKeys: { book: string; file: string }[];
  onSelect: (bookIndex: number) => void;
  onClose: () => void;
}) {
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
          {manifestKeys.map((item, idx) => (
            <li key={idx}>
              <button
                onClick={() => {
                  onSelect(idx);
                  onClose();
                }}
                className="text-blue-600 hover:text-blue-800 transition-colors"
              >
                {item.file.replace(/\.txt$/i, '').replace(/_/g, ' ')}
              </button>
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

function App() {
  const [basePath, setBasePath] = React.useState('');

  React.useEffect(() => {
    async function fetchBasePath() {
      if (window.electronAPI) {
        const path = await window.electronAPI.getBasePath();
        setBasePath(path);
      }
    }
    fetchBasePath();
  }, []);
  const [manifest, setManifest] = React.useState<{ [book: string]: string[] } | null>(
    null
  );
  const [loadingManifest, setLoadingManifest] = React.useState(true);
  const [isMobile, setIsMobile] = React.useState(false);


  


  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [chapters, setChapters] = React.useState<BookPage[]>([]);
  const [pages, setPages] = React.useState<RenderedPage[]>([]);
  const [chapterMapping, setChapterMapping] = React.useState<ChapterMapping[]>([]);
  const [currentPage, setCurrentPage] = React.useState(0);
  const [isFetchingChapter, setIsFetchingChapter] = React.useState(false);

  const [initialFileParam, initialPageParam] = React.useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const file = params.get('file') ?? null;
    const page = parseInt(params.get('page') ?? '', 10);
    const safePage = Number.isNaN(page) ? 0 : page;
    return [file, safePage];
  }, []);

  React.useEffect(() => {
    async function loadManifest() {
      if (!basePath) return; // wait until basePath is set
      const filePath = `${basePath}/nabre_books/books.json`;
      try {
        const fileContent = await window.electronAPI.readLocalFile(filePath);
        const data = JSON.parse(fileContent);
        setManifest(data);
      } catch (error) {
        console.error('Failed to load manifest:', error);
      }
      setLoadingManifest(false);
    }
    loadManifest();
  }, [basePath]);

  const flatManifest = React.useMemo(() => {
    if (!manifest) return [];
    const list: { book: string; file: string }[] = [];
    for (const [book, files] of Object.entries(manifest)) {
      for (const file of files) {
        list.push({ book, file });
      }
    }
    return list;
  }, [manifest]);

  function updateUrl(fileName: string, page: number) {
    const params = new URLSearchParams(window.location.search);
    params.set('file', fileName);
    params.set('page', String(page));
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }

  function recalcAndSetAll(updatedChapters: BookPage[]) {
    const charsPerPage = isMobile ? 1300 : 1700;
    const newPages = paginateChapters(updatedChapters, charsPerPage);
    const newMapping = getChapterIndexMapping(updatedChapters, newPages);
    setChapters(updatedChapters);
    setPages(newPages);
    setChapterMapping(newMapping);
  }

  async function loadChapterByIndex(idx: number) {
    if (idx < 0 || idx >= flatManifest.length) return null;
    const { book, file } = flatManifest[idx];
    const filePath = `${basePath}/nabre_books/${book}/${file}`;
    try {
      const content = await window.electronAPI.readLocalFile(filePath);
      return {
        folder: book.replace(/_/g, ' '),
        fileName: file.replace(/\.txt$/i, '').replace(/_/g, ' '),
        content,
      };
    } catch (error) {
      console.error(`Error reading file at ${filePath}`, error);
      return null;
    }
  }
  
  

  // On first render, load initial chapters from URL
  React.useEffect(() => {
    if (!loadingManifest && flatManifest.length > 0 && chapters.length === 0) {
      (async () => {
        let idxToLoad = 0;
        if (initialFileParam) {
          const foundIndex = flatManifest.findIndex(
            (item) => item.file.replace(/\.txt$/i, '') === initialFileParam
          );
          if (foundIndex >= 0) idxToLoad = foundIndex;
        }
        const chaptersToLoad: BookPage[] = [];
        // Load all chapters from 0 to idxToLoad so that pagination is calculated globally.
        for (let i = 0; i <= idxToLoad; i++) {
          setIsFetchingChapter(true);
          const chap = await loadChapterByIndex(i);
          setIsFetchingChapter(false);
          if (chap) chaptersToLoad.push(chap);
        }
        recalcAndSetAll(chaptersToLoad);
        await handlePageChange(Math.max(0, initialPageParam));
      })();
    }
  }, [
    loadingManifest,
    flatManifest,
    chapters.length,
    initialFileParam,
    initialPageParam,
  ]);

  // User picks something in the menu
  async function handleSelectChapter(bookIndex: number) {
    let newChapters = [...chapters];
    // Use the current count as the highest loaded chapter index.
    let highestLoaded = newChapters.length - 1;

    if (bookIndex > highestLoaded) {
      for (let idx = highestLoaded + 1; idx <= bookIndex; idx++) {
        setIsFetchingChapter(true);
        const newChap = await loadChapterByIndex(idx);
        setIsFetchingChapter(false);
        if (newChap) {
          newChapters.push(newChap);
        }
      }
      recalcAndSetAll(newChapters);
    }

    // Recalculate the mapping using the new chapters.
    const charsPerPage = isMobile ? 1300 : 1700;
    const newPages = paginateChapters(newChapters, charsPerPage);
    const newMapping = getChapterIndexMapping(newChapters, newPages);

    const target = newMapping.find((m) => m.chapterIndex === bookIndex);
    if (target) {
      setCurrentPage(target.globalPageIndex);
      updateUrl(
        flatManifest[bookIndex].file.replace(/\.txt$/i, ''),
        target.globalPageIndex
      );
    }
  }

  // Called when user hits next/prev
  async function handlePageChange(newPage: number) {
    let currentChapters = chapters;
    let newPages = pages;
    const charsPerPage = isMobile ? 1300 : 1700;

    // Load chapters until we have enough pages for the requested newPage
    while (newPage >= newPages.length) {
      const highestLoaded = currentChapters.length - 1;
      if (highestLoaded >= flatManifest.length - 1) break;
      setIsFetchingChapter(true);
      const nextChapter = await loadChapterByIndex(highestLoaded + 1);
      setIsFetchingChapter(false);
      if (!nextChapter) break;
      currentChapters = [...currentChapters, nextChapter];
      newPages = paginateChapters(currentChapters, charsPerPage);
      setChapterMapping(getChapterIndexMapping(currentChapters, newPages));
      setChapters(currentChapters);
      setPages(newPages);
    }

    const finalPage = newPage < newPages.length ? newPage : newPages.length - 1;
    setCurrentPage(finalPage);

    const p = newPages[finalPage];
    if (p) {
      const originalIndex = flatManifest.findIndex(
        (f) =>
          f.book.replace(/_/g, ' ') === p.folder &&
          f.file.replace(/\.txt$/i, '').replace(/_/g, ' ') === p.fileName
      );
      if (originalIndex >= 0) {
        updateUrl(flatManifest[originalIndex].file.replace(/\.txt$/i, ''), finalPage);
      }
    }
  }

  async function ensureNextChapterLoaded() {
    if (!chapters.length) return;
    const maxLoaded = chapters.length - 1;
    if (maxLoaded < flatManifest.length - 1) {
      const nextIdx = maxLoaded + 1;
      if (!chapters[nextIdx]) {
        setIsFetchingChapter(true);
        const nextChapter = await loadChapterByIndex(nextIdx);
        setIsFetchingChapter(false);
        if (nextChapter) {
          const updated = [...chapters, nextChapter];
          recalcAndSetAll(updated);
        }
      }
    }
  }

  if (loadingManifest && chapters.length === 0) {
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
        pages={pages}
        chapterMapping={chapterMapping}
        flatManifest={flatManifest}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onSelectChapter={handleSelectChapter}
        isMobile={isMobile}
        ensureNextChapterLoaded={ensureNextChapterLoaded}
      />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
