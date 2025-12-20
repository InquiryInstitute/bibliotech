/**
 * Bibliotech - Main Application
 * Fetches books from Supabase and renders bookshelf
 */

// Supabase configuration
// Load from config.js or use environment variables
let SUPABASE_URL, SUPABASE_ANON_KEY;

// Try to load from config.js
if (typeof CONFIG !== 'undefined') {
    SUPABASE_URL = CONFIG.SUPABASE_URL;
    SUPABASE_ANON_KEY = CONFIG.SUPABASE_ANON_KEY;
} else {
    // Fallback to inline values (update these)
    SUPABASE_URL = 'YOUR_SUPABASE_URL';
    SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
}

// Supabase client will be initialized by supabase-init.js
// Wait for it to be ready
let supabase;
let initCalled = false;

function tryInit() {
    if (initCalled) return;
    
    // Check if DOM is ready
    if (document.readyState === 'loading') {
        return;
    }
    
    // Check if Supabase is ready
    if (!window.supabaseClient) {
        return;
    }
    
    // Check if config is set
    if (!SUPABASE_URL || 
        SUPABASE_URL === 'YOUR_SUPABASE_URL' || 
        SUPABASE_URL === 'your_supabase_project_url') {
        console.error('Please configure Supabase URL and key in config.js or .env file');
        const bookshelfEl = document.getElementById('bookshelf');
        if (bookshelfEl) {
            bookshelfEl.innerHTML = `
                <div class="error-message">
                    <p><strong>Configuration Required</strong></p>
                    <p>Please update config.js with your Supabase credentials:</p>
                    <ol style="text-align: left; max-width: 600px; margin: 20px auto;">
                        <li>Get your Supabase URL and anon key from your Supabase dashboard</li>
                        <li>Update config.js or run: <code>npm run build-config</code> (if you have .env set up)</li>
                        <li>Refresh this page</li>
                    </ol>
                    <p>Or edit .env file and run: <code>npm run build-config</code></p>
                </div>
            `;
            bookshelfEl.style.display = 'block';
        }
        return;
    }
    
    supabase = window.supabaseClient;
    initCalled = true;
    init();
}

// Wait for Supabase to be ready
window.addEventListener('supabaseReady', () => {
    supabase = window.supabaseClient;
    if (!supabase) {
        console.error('Failed to initialize Supabase. Please check your configuration.');
        if (typeof showError === 'function') {
            showError('Failed to initialize Supabase. Please check your configuration.');
        }
        return;
    }
    tryInit();
});

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(tryInit, 100);
    });
} else {
    // Check if Supabase is already ready
    setTimeout(tryInit, 100);
}

// State
let allBooks = [];
let filteredBooks = [];
let currentCategoryIndex = 0;
const DEWEY_CATEGORIES = ['000', '100', '200', '300', '400', '500', '600', '700', '800', '900'];
let selectedSources = ['gutenberg', 'wikibooks', 'inquirer', 'iNQ', 'custom']; // Default: all sources

/**
 * Initialize the application
 */
async function init() {
    // Verify Supabase client is available
    if (!supabase) {
        console.error('Supabase client not initialized');
        showError('Supabase client not initialized. Please check your configuration.');
        return;
    }

    // Set up event listeners
    const searchEl = document.getElementById('search');
    const filterEl = document.getElementById('dewey-filter');
    const closeEl = document.querySelector('.close');
    const modalEl = document.getElementById('book-modal');
    const prevBtn = document.getElementById('prev-category');
    const nextBtn = document.getElementById('next-category');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const applySettingsBtn = document.getElementById('apply-settings');
    const cancelSettingsBtn = document.getElementById('cancel-settings');
    const sourceAllCheckbox = document.getElementById('source-all');
    
    if (searchEl) searchEl.addEventListener('input', handleSearch);
    if (filterEl) filterEl.addEventListener('change', handleFilter);
    if (closeEl) closeEl.addEventListener('click', closeModal);
    if (prevBtn) prevBtn.addEventListener('click', () => navigateCategory(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => navigateCategory(1));
    
    // Settings modal handlers
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            if (settingsModal) {
                settingsModal.style.display = 'block';
                loadSettingsState();
            }
        });
    }
    
    if (settingsModal) {
        const modalClose = settingsModal.querySelector('.modal-close');
        if (modalClose) {
            modalClose.addEventListener('click', () => {
                settingsModal.style.display = 'none';
            });
        }
        
        // Close on outside click
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.style.display = 'none';
            }
        });
    }
    
    if (applySettingsBtn) {
        applySettingsBtn.addEventListener('click', applySourceFilters);
    }
    
    if (cancelSettingsBtn) {
        cancelSettingsBtn.addEventListener('click', () => {
            if (settingsModal) settingsModal.style.display = 'none';
        });
    }
    
    // Handle "All Sources" checkbox
    if (sourceAllCheckbox) {
        sourceAllCheckbox.addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('input[name="source"]:not(#source-all)');
            checkboxes.forEach(cb => {
                cb.checked = e.target.checked;
            });
        });
    }
    
    // Update individual checkboxes to uncheck "All" when any individual is unchecked
    document.querySelectorAll('input[name="source"]:not(#source-all)').forEach(cb => {
        cb.addEventListener('change', () => {
            if (sourceAllCheckbox) {
                const allChecked = Array.from(document.querySelectorAll('input[name="source"]:not(#source-all)')).every(c => c.checked);
                sourceAllCheckbox.checked = allChecked;
            }
        });
    });
    
    // Marginalia form handlers
    const showAddBtn = document.getElementById('show-add-marginalia');
    const cancelBtn = document.getElementById('cancel-marginalia');
    const marginaliaForm = document.getElementById('marginalia-form');
    
    if (showAddBtn) {
        showAddBtn.addEventListener('click', () => {
            document.getElementById('add-marginalia-form').style.display = 'block';
            showAddBtn.style.display = 'none';
        });
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            document.getElementById('add-marginalia-form').style.display = 'none';
            if (showAddBtn) showAddBtn.style.display = 'inline-block';
            marginaliaForm.reset();
        });
    }
    
    if (marginaliaForm) {
        marginaliaForm.addEventListener('submit', handleMarginaliaSubmit);
    }
    
    const generateAIBtn = document.getElementById('generate-ai-marginalia');
    if (generateAIBtn) {
        generateAIBtn.addEventListener('click', async () => {
            if (currentBook) {
                await generateMarginaliaForBook(currentBook.id);
            }
        });
    }
    if (modalEl) {
        modalEl.addEventListener('click', (e) => {
            if (e.target.id === 'book-modal') {
                closeModal();
            }
        });
    }
    
    // Book reader handlers
    const closeReader = document.getElementById('close-reader');
    const readerModal = document.getElementById('book-reader-modal');
    const toggleMarginaliaBtn = document.getElementById('toggle-marginalia');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    
    if (closeReader) {
        closeReader.addEventListener('click', closeBookReader);
    }
    
    if (readerModal) {
        readerModal.addEventListener('click', (e) => {
            if (e.target.id === 'book-reader-modal') {
                closeBookReader();
            }
        });
    }
    
    if (toggleMarginaliaBtn) {
        toggleMarginaliaBtn.addEventListener('click', toggleMarginaliaDisplay);
    }
    
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => changePage(-1));
    }
    
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => changePage(1));
    }
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' && !e.target.matches('input, textarea')) {
            navigateCategory(-1);
        } else if (e.key === 'ArrowRight' && !e.target.matches('input, textarea')) {
            navigateCategory(1);
        }
    });

    // Load books
    await loadBooks();
    
    // Initialize source filter display
    updateSourceFilterDisplay();
}

/**
 * Load books for a specific Dewey Decimal category
 */
async function loadBooksForCategory(category) {
    try {
        // Get the range for this category (e.g., 800-899 for category 800)
        const categoryStart = category;
        const categoryEnd = (parseInt(category) + 99).toString().padStart(3, '0');
        
        let query = supabase
            .from('books')
            .select('id, gutenberg_id, book_uri, source, source_id, title, author, dewey_decimal, language, subject, publication_date, faculty_id, description, cover_url')
            .gte('dewey_decimal', categoryStart)
            .lt('dewey_decimal', categoryEnd);
        
        // Apply source filter if not showing all sources
        if (selectedSources.length > 0 && selectedSources.length < 5) {
            query = query.in('source', selectedSources);
        }
        
        const { data, error } = await query
            .order('dewey_decimal', { ascending: true })
            .order('title', { ascending: true })
            .limit(1000); // Limit per category

        if (error) {
            throw error;
        }

        return data || [];
    } catch (error) {
        console.error(`Error loading books for category ${category}:`, error);
        return [];
    }
}

/**
 * Navigate to a specific Dewey Decimal category
 */
async function navigateCategory(direction) {
    const newIndex = currentCategoryIndex + direction;
    
    if (newIndex < 0 || newIndex >= DEWEY_CATEGORIES.length) {
        return; // Can't go beyond first/last category
    }
    
    currentCategoryIndex = newIndex;
    await loadCategory(currentCategoryIndex);
    updateNavigationUI();
}

/**
 * Load and display a specific category
 */
async function loadCategory(index) {
    const category = DEWEY_CATEGORIES[index];
    const loadingEl = document.getElementById('loading');
    const bookshelfEl = document.getElementById('bookshelf');
    const emptyStateEl = document.getElementById('empty-state');

    loadingEl.style.display = 'block';
    bookshelfEl.style.display = 'none';
    emptyStateEl.style.display = 'none';

    try {
        const books = await loadBooksForCategory(category);
        
        // Render the shelf
        let html = `<div class="bookshelf-section" data-category="${category}">
            <h3 class="category-header">${getCategoryName(category)}</h3>
            <div class="book-row" id="shelf-${category}">`;
        
        if (books.length === 0) {
            html += '<div class="shelf-empty">No books in this category</div>';
        } else {
            html += books.map((book, bookIndex) => renderBookSpine(book, bookIndex)).join('');
        }
        
        html += `</div></div>`;
        
        bookshelfEl.innerHTML = html;
        bookshelfEl.style.display = 'block';
        loadingEl.style.display = 'none';
        
        // Add click handlers
        bookshelfEl.querySelectorAll('.book-spine').forEach(spine => {
            spine.addEventListener('click', () => {
                const bookId = spine.dataset.bookId;
                const book = books.find(b => b.id === bookId);
                if (book) {
                    showBookDetails(book);
                }
            });
        });
        
        // Store books for this category
        filteredBooks = books;
        
    } catch (error) {
        console.error('Error loading category:', error);
        loadingEl.style.display = 'none';
        showError(`Failed to load books: ${error.message}. Please check your Supabase configuration.`);
    }
}

/**
 * Update navigation UI
 */
function updateNavigationUI() {
    const prevBtn = document.getElementById('prev-category');
    const nextBtn = document.getElementById('next-category');
    const categoryNameEl = document.getElementById('current-category-name');
    const categoryRangeEl = document.getElementById('current-category-range');
    
    // Update buttons
    if (prevBtn) {
        prevBtn.disabled = currentCategoryIndex === 0;
        prevBtn.classList.toggle('disabled', currentCategoryIndex === 0);
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentCategoryIndex === DEWEY_CATEGORIES.length - 1;
        nextBtn.classList.toggle('disabled', currentCategoryIndex === DEWEY_CATEGORIES.length - 1);
    }
    
    // Update category display
    if (categoryNameEl) {
        categoryNameEl.textContent = getCategoryName(DEWEY_CATEGORIES[currentCategoryIndex]);
    }
    
    if (categoryRangeEl) {
        categoryRangeEl.textContent = `Category ${currentCategoryIndex + 1} of ${DEWEY_CATEGORIES.length}`;
    }
}

/**
 * Load all category structures first, then load books per shelf
 */
async function loadBooks() {
    // Start with first category
    currentCategoryIndex = 0;
    await loadCategory(currentCategoryIndex);
    updateNavigationUI();
}

/**
 * Render the bookshelf
 */
function renderBookshelf() {
    const bookshelfEl = document.getElementById('bookshelf');
    const emptyStateEl = document.getElementById('empty-state');

    if (filteredBooks.length === 0) {
        bookshelfEl.style.display = 'none';
        emptyStateEl.style.display = 'block';
        return;
    }

    bookshelfEl.style.display = 'block';
    emptyStateEl.style.display = 'none';

    // Group books by Dewey Decimal category
    const booksByCategory = groupByDewey(filteredBooks);

    // Render each category
    let html = '';
    for (const [category, books] of Object.entries(booksByCategory)) {
        html += `<div class="bookshelf-section">
            <h3 class="category-header">${getCategoryName(category)}</h3>
            <div class="book-row">`;
        
        books.forEach(book => {
            html += renderBookSpine(book);
        });
        
        html += `</div></div>`;
    }

    bookshelfEl.innerHTML = html;

    // Add click handlers to book spines
    bookshelfEl.querySelectorAll('.book-spine').forEach(spine => {
        spine.addEventListener('click', () => {
            const bookId = spine.dataset.bookId;
            const book = filteredBooks.find(b => b.id === bookId);
            if (book) {
                showBookDetails(book);
            }
        });
    });
}

/**
 * Group books by Dewey Decimal category
 */
function groupByDewey(books) {
    const grouped = {};
    
    books.forEach(book => {
        const dewey = book.dewey_decimal || '000';
        const category = dewey.substring(0, 1) + '00'; // Get main category (e.g., 800 from 823.91)
        
        if (!grouped[category]) {
            grouped[category] = [];
        }
        grouped[category].push(book);
    });

    // Sort categories
    const sortedCategories = Object.keys(grouped).sort();
    const sorted = {};
    sortedCategories.forEach(cat => {
        sorted[cat] = grouped[cat];
    });

    return sorted;
}

/**
 * Get category name from Dewey Decimal code
 */
function getCategoryName(code) {
    const names = {
        '000': '000 - Computer Science, Information & General Works',
        '100': '100 - Philosophy & Psychology',
        '200': '200 - Religion',
        '300': '300 - Social Sciences',
        '400': '400 - Language',
        '500': '500 - Science',
        '600': '600 - Technology',
        '700': '700 - Arts & Recreation',
        '800': '800 - Literature',
        '900': '900 - History & Geography'
    };
    return names[code] || `${code} - Uncategorized`;
}

/**
 * Render a single book spine with animation delay
 */
function renderBookSpine(book, index = 0) {
    const title = escapeHtml(book.title || 'Untitled');
    const author = escapeHtml(book.author || 'Unknown');
    const dewey = book.dewey_decimal || '000';
    
    // Generate a color based on Dewey Decimal for visual variety
    const color = getColorForDewey(dewey);
    
    // Truncate title and author if too long for spine
    const maxTitleLength = 30;
    const maxAuthorLength = 25;
    const displayTitle = title.length > maxTitleLength ? title.substring(0, maxTitleLength - 3) + '...' : title;
    const displayAuthor = author.length > maxAuthorLength ? author.substring(0, maxAuthorLength - 3) + '...' : author;
    
    // Add staggered animation delay for visual effect
    const animationDelay = (index % 20) * 0.03; // Stagger books in groups
    
    // Add cover image as background if available
    const coverStyle = book.cover_url 
        ? `background-image: linear-gradient(to bottom, ${color}, ${color}), url('${escapeHtml(book.cover_url)}'); background-size: cover; background-blend-mode: overlay;`
        : `background: ${color};`;
    
    return `
        <div class="book-spine" 
             data-book-id="${book.id}" 
             style="--spine-color: ${color}; animation-delay: ${animationDelay}s; ${coverStyle}"
             title="${escapeHtml(title)} by ${escapeHtml(author)} - ${dewey}">
            <div class="spine-content">
                <div class="spine-title">${displayTitle}</div>
                <div class="spine-author">${displayAuthor}</div>
                <div class="spine-dewey">${dewey}</div>
            </div>
        </div>
    `;
}

/**
 * Get color for Dewey Decimal category
 */
function getColorForDewey(dewey) {
    const category = dewey.substring(0, 1);
    const colors = {
        '0': '#4A90E2', // Blue
        '1': '#7B68EE', // Medium Slate Blue
        '2': '#9370DB', // Medium Purple
        '3': '#BA55D3', // Medium Orchid
        '4': '#DA70D6', // Orchid
        '5': '#FF69B4', // Hot Pink
        '6': '#FF6347', // Tomato
        '7': '#FF8C00', // Dark Orange
        '8': '#FFA500', // Orange
        '9': '#FFD700'  // Gold
    };
    return colors[category] || '#808080';
}

/**
 * Handle search input
 */
/**
 * Load settings state into modal
 */
function loadSettingsState() {
    const checkboxes = document.querySelectorAll('input[name="source"]:not(#source-all)');
    checkboxes.forEach(cb => {
        cb.checked = selectedSources.includes(cb.value);
    });
    
    const sourceAllCheckbox = document.getElementById('source-all');
    if (sourceAllCheckbox) {
        sourceAllCheckbox.checked = selectedSources.length >= 5;
    }
}

/**
 * Apply source filters from settings
 */
async function applySourceFilters() {
    const checkboxes = document.querySelectorAll('input[name="source"]:not(#source-all)');
    selectedSources = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);
    
    // Update filter display
    updateSourceFilterDisplay();
    
    // Close modal
    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal) {
        settingsModal.style.display = 'none';
    }
    
    // Reload current category with new filters
    await loadCategory(currentCategoryIndex);
}

/**
 * Update source filter display badge
 */
function updateSourceFilterDisplay() {
    const displayEl = document.getElementById('source-filter-display');
    if (!displayEl) return;
    
    if (selectedSources.length === 0) {
        displayEl.innerHTML = '<span class="filter-badge">No Sources</span>';
    } else if (selectedSources.length >= 5) {
        displayEl.innerHTML = '<span class="filter-badge">All Sources</span>';
    } else {
        const sourceNames = {
            'gutenberg': 'Gutenberg',
            'wikibooks': 'Wikibooks',
            'inquirer': 'Inquirer',
            'iNQ': 'iNQ',
            'custom': 'Custom'
        };
        const names = selectedSources.map(s => sourceNames[s] || s).join(', ');
        displayEl.innerHTML = `<span class="filter-badge">${names}</span>`;
    }
}

function handleSearch() {
    const query = document.getElementById('search').value.toLowerCase().trim();
    filterBooks();
}

/**
 * Handle Dewey filter
 */
function handleFilter() {
    const deweyFilter = document.getElementById('dewey-filter').value;
    if (!deweyFilter) {
        // If "All Categories" selected, go back to navigation mode
        currentCategoryIndex = 0;
        loadCategory(currentCategoryIndex);
        updateNavigationUI();
    } else {
        // Find the category index and navigate to it
        const categoryIndex = DEWEY_CATEGORIES.indexOf(deweyFilter);
        if (categoryIndex !== -1) {
            currentCategoryIndex = categoryIndex;
            loadCategory(currentCategoryIndex);
            updateNavigationUI();
        }
    }
}

/**
 * Filter books based on search and category
 */
async function filterBooks() {
    const searchQuery = document.getElementById('search').value.toLowerCase().trim();
    const deweyFilter = document.getElementById('dewey-filter').value;

    // If filtering by category, load that category's books
    if (deweyFilter && !searchQuery) {
        const loadingEl = document.getElementById('loading');
        const bookshelfEl = document.getElementById('bookshelf');
        
        loadingEl.style.display = 'block';
        bookshelfEl.style.display = 'none';
        
        const books = await loadBooksForCategory(deweyFilter);
        
        // Show only the selected category
        let html = `<div class="bookshelf-section" data-category="${deweyFilter}">
            <h3 class="category-header">${getCategoryName(deweyFilter)}</h3>
            <div class="book-row">`;
        
        if (books.length === 0) {
            html += '<div class="shelf-empty">No books in this category</div>';
        } else {
            html += books.map((book, index) => renderBookSpine(book, index)).join('');
        }
        
        html += `</div></div>`;
        
        bookshelfEl.innerHTML = html;
        bookshelfEl.style.display = 'block';
        loadingEl.style.display = 'none';
        
        // Add click handlers
        bookshelfEl.querySelectorAll('.book-spine').forEach(spine => {
            spine.addEventListener('click', () => {
                const bookId = spine.dataset.bookId;
                const book = books.find(b => b.id === bookId);
                if (book) {
                    showBookDetails(book);
                }
            });
        });
        
        filteredBooks = books;
        return;
    }

    // If searching, filter from all loaded books
    filteredBooks = allBooks.filter(book => {
        // Search filter
        if (searchQuery) {
            const title = (book.title || '').toLowerCase();
            const author = (book.author || '').toLowerCase();
            if (!title.includes(searchQuery) && !author.includes(searchQuery)) {
                return false;
            }
        }

        // Dewey filter
        if (deweyFilter) {
            const bookDewey = book.dewey_decimal || '000';
            const bookCategory = bookDewey.substring(0, 1) + '00';
            if (bookCategory !== deweyFilter) {
                return false;
            }
        }

        return true;
    });

    // Render filtered results
    renderBookshelf();
}

// Store current book for marginalia
let currentBook = null;
let currentReaderBook = null;
let currentPage = 1;
let showMarginalia = false;
let bookMarginalia = [];

/**
 * Show book details in modal
 */
async function showBookDetails(book) {
    currentBook = book;
    const modal = document.getElementById('book-modal');
    const detailsEl = document.getElementById('book-details');
    const marginaliaSection = document.getElementById('marginalia-section');
    
    const html = `
        <h2>${escapeHtml(book.title || 'Untitled')}</h2>
        <div class="book-meta">
            <p><strong>Author:</strong> ${escapeHtml(book.author || 'Unknown')}</p>
            <p><strong>Dewey Decimal:</strong> ${escapeHtml(book.dewey_decimal || 'N/A')}</p>
            ${book.subject ? `<p><strong>Subject:</strong> ${escapeHtml(book.subject)}</p>` : ''}
            ${book.language ? `<p><strong>Language:</strong> ${escapeHtml(book.language)}</p>` : ''}
            ${book.publication_date ? `<p><strong>Publication Date:</strong> ${escapeHtml(book.publication_date)}</p>` : ''}
            ${book.faculty ? `<p><strong>Curated by:</strong> ${escapeHtml(book.faculty.name || 'Faculty')}</p>` : ''}
        </div>
        ${book.description ? `<div class="book-description"><p>${escapeHtml(book.description)}</p></div>` : ''}
        <div class="book-actions">
            <button onclick="openBookReader('${book.id}')" class="btn btn-primary">
                Read Book
            </button>
            ${getBookSourceLink(book)}
        </div>
    `;
    
    detailsEl.innerHTML = html;
    marginaliaSection.style.display = 'block';
    modal.style.display = 'block';
    
    // Load marginalia for this book
    await loadMarginalia(book.id);
}

/**
 * Close modal
 */
function closeModal() {
    document.getElementById('book-modal').style.display = 'none';
}

/**
 * Show error message
 */
function showError(message) {
    const bookshelfEl = document.getElementById('bookshelf');
    bookshelfEl.innerHTML = `<div class="error-message"><p>${escapeHtml(message)}</p></div>`;
    bookshelfEl.style.display = 'block';
}

/**
 * Load marginalia for a book
 */
async function loadMarginalia(bookId) {
    const marginaliaList = document.getElementById('marginalia-list');
    if (!marginaliaList) return;
    
    try {
        const { data, error } = await supabase
            .from('marginalia')
            .select('*, faculty:faculty_id(*)')
            .eq('book_id', bookId)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error loading marginalia:', error);
            marginaliaList.innerHTML = '<p class="error">Failed to load comments.</p>';
            return;
        }
        
        if (!data || data.length === 0) {
            marginaliaList.innerHTML = '<p class="no-marginalia">No faculty comments yet. Be the first to add one!</p>';
            return;
        }
        
        marginaliaList.innerHTML = data.map(m => `
            <div class="marginalia-item">
                <div class="marginalia-header">
                    <strong>${escapeHtml(m.faculty?.name || 'Faculty Member')}</strong>
                    <span class="marginalia-date">${new Date(m.created_at).toLocaleDateString()}</span>
                </div>
                ${m.location ? `<div class="marginalia-location">📍 ${escapeHtml(m.location)}</div>` : ''}
                ${m.quote ? `<div class="marginalia-quote">"${escapeHtml(m.quote)}"</div>` : ''}
                <div class="marginalia-comment">${escapeHtml(m.comment)}</div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading marginalia:', error);
        marginaliaList.innerHTML = '<p class="error">Failed to load comments.</p>';
    }
}

/**
 * Generate marginalia algorithmically using AI faculty
 */
async function generateMarginaliaForBook(bookId) {
    if (!confirm('Generate AI marginalia for this book? This may take a few minutes.')) {
        return;
    }
    
    const loadingMsg = document.createElement('div');
    loadingMsg.className = 'loading-message';
    loadingMsg.textContent = 'Generating AI marginalia... This may take a few minutes.';
    const marginaliaList = document.getElementById('marginalia-list');
    if (marginaliaList) {
        marginaliaList.innerHTML = '';
        marginaliaList.appendChild(loadingMsg);
    }
    
    try {
        // Call API endpoint or use Supabase Edge Function
        // For now, we'll use a simple approach - in production, use an Edge Function
        const response = await fetch('/api/generate-marginalia', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ book_id: bookId, num_pages: 5 })
        });
        
        if (!response.ok) {
            throw new Error('Failed to generate marginalia');
        }
        
        // Reload marginalia
        await loadMarginalia(bookId);
        alert('Marginalia generation started! Check back in a few minutes.');
        
    } catch (error) {
        console.error('Error generating marginalia:', error);
        alert('Note: Marginalia generation requires a backend API. For now, use the manual form or run: npm run generate-marginalia <book-id>');
        
        // Show manual form as fallback
        if (marginaliaList) {
            marginaliaList.innerHTML = '<p>AI generation requires backend setup. Use the "Add Marginalia" button for manual entry.</p>';
        }
    }
}

/**
 * Handle marginalia form submission
 */
async function handleMarginaliaSubmit(e) {
    e.preventDefault();
    
    if (!currentBook) {
        alert('No book selected');
        return;
    }
    
    const location = document.getElementById('marginalia-location').value.trim();
    const quote = document.getElementById('marginalia-quote').value.trim();
    const comment = document.getElementById('marginalia-comment').value.trim();
    
    if (!comment) {
        alert('Please enter a comment');
        return;
    }
    
    // For now, we'll use a placeholder faculty_id
    // In production, this should come from authentication
    const facultyId = prompt('Enter your faculty ID (or name):') || 'anonymous';
    
    try {
        const { data, error } = await supabase
            .from('marginalia')
            .insert([{
                book_id: currentBook.id,
                faculty_id: facultyId,
                location: location || null,
                quote: quote || null,
                comment: comment
            }])
            .select()
            .single();
        
        if (error) {
            throw error;
        }
        
        // Reload marginalia
        await loadMarginalia(currentBook.id);
        
        // Reset form
        document.getElementById('marginalia-form').reset();
        document.getElementById('add-marginalia-form').style.display = 'none';
        const showAddBtn = document.getElementById('show-add-marginalia');
        if (showAddBtn) showAddBtn.style.display = 'inline-block';
        
    } catch (error) {
        console.error('Error adding marginalia:', error);
        alert('Failed to add comment. Please try again.');
    }
}

/**
 * Open book reader with pageflip view
 */
async function openBookReader(bookId) {
    const book = allBooks.find(b => b.id === bookId) || filteredBooks.find(b => b.id === bookId);
    if (!book) {
        alert('Book not found');
        return;
    }
    
    currentReaderBook = book;
    currentPage = 1;
    showMarginalia = false;
    
    const readerModal = document.getElementById('book-reader-modal');
    const readerTitle = document.getElementById('reader-book-title');
    const toggleBtn = document.getElementById('toggle-marginalia');
    
    if (readerTitle) {
        readerTitle.textContent = book.title || 'Untitled';
    }
    
    if (toggleBtn) {
        toggleBtn.textContent = 'Show Marginalia';
    }
    
    // Load marginalia for this book
    await loadMarginaliaForReader(bookId);
    
    // Load book content (for now, show placeholder - will need to fetch actual content)
    loadBookPage(currentPage);
    
    if (readerModal) {
        readerModal.style.display = 'block';
    }
}

/**
 * Close book reader
 */
function closeBookReader() {
    const readerModal = document.getElementById('book-reader-modal');
    if (readerModal) {
        readerModal.style.display = 'none';
    }
    currentReaderBook = null;
    currentPage = 1;
    showMarginalia = false;
}

/**
 * Load marginalia for reader view
 */
async function loadMarginaliaForReader(bookId) {
    try {
        const { data, error } = await supabase
            .from('marginalia')
            .select('*, faculty:faculty_id(*)')
            .eq('book_id', bookId)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error loading marginalia:', error);
            bookMarginalia = [];
            return;
        }
        
        bookMarginalia = data || [];
    } catch (error) {
        console.error('Error loading marginalia:', error);
        bookMarginalia = [];
    }
}

/**
 * Load book page content
 */
function loadBookPage(page) {
    const leftPage = document.getElementById('left-page');
    const rightPage = document.getElementById('right-page');
    const leftContent = leftPage?.querySelector('.page-content');
    const rightContent = rightPage?.querySelector('.page-content');
    const pageInfo = document.getElementById('reader-page-info');
    
    // For now, show placeholder content
    // In the future, this will fetch actual book content from Project Gutenberg
    const placeholderText = `
        <h3>Chapter ${page}</h3>
        <p>This is a placeholder for book content. In the future, this will display the actual text from Project Gutenberg books.</p>
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
        <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
        <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.</p>
    `;
    
    if (leftContent) {
        leftContent.innerHTML = placeholderText;
    }
    
    if (rightContent) {
        rightContent.innerHTML = placeholderText;
    }
    
    if (pageInfo) {
        pageInfo.textContent = `Page ${page}`;
    }
    
    // Render marginalia overlays
    renderMarginaliaOverlay();
}

/**
 * Render marginalia overlay on pages
 */
function renderMarginaliaOverlay() {
    const leftOverlay = document.getElementById('left-marginalia');
    const rightOverlay = document.getElementById('right-marginalia');
    
    if (!leftOverlay || !rightOverlay) return;
    
    // Clear existing overlays
    leftOverlay.innerHTML = '';
    rightOverlay.innerHTML = '';
    
    if (!showMarginalia || !bookMarginalia || bookMarginalia.length === 0) {
        return;
    }
    
    // Distribute marginalia between left and right pages
    bookMarginalia.forEach((marg, index) => {
        const note = document.createElement('div');
        note.className = 'marginalia-note';
        note.style.top = `${20 + (index % 5) * 120}px`;
        note.style.left = index % 2 === 0 ? '10px' : 'auto';
        note.style.right = index % 2 === 0 ? 'auto' : '10px';
        
        note.innerHTML = `
            <div class="marginalia-author">${escapeHtml(marg.faculty?.name || 'Faculty')}</div>
            <div class="marginalia-text">${escapeHtml(marg.comment)}</div>
            ${marg.location ? `<div class="marginalia-location">${escapeHtml(marg.location)}</div>` : ''}
        `;
        
        // Add click to show full details
        note.addEventListener('click', () => {
            showMarginaliaDetails(marg);
        });
        
        // Add to left or right page
        if (index % 2 === 0) {
            leftOverlay.appendChild(note);
        } else {
            rightOverlay.appendChild(note);
        }
    });
}

/**
 * Toggle marginalia display
 */
function toggleMarginaliaDisplay() {
    showMarginalia = !showMarginalia;
    const toggleBtn = document.getElementById('toggle-marginalia');
    
    if (toggleBtn) {
        toggleBtn.textContent = showMarginalia ? 'Hide Marginalia' : 'Show Marginalia';
    }
    
    renderMarginaliaOverlay();
}

/**
 * Change page
 */
function changePage(direction) {
    const newPage = currentPage + direction;
    if (newPage < 1) return;
    
    currentPage = newPage;
    loadBookPage(currentPage);
}

/**
 * Show marginalia details in a tooltip/modal
 */
function showMarginaliaDetails(marg) {
    // Could show a tooltip or open a small modal with full details
    const quote = marg.quote ? `\n\nQuote: "${marg.quote}"` : '';
    alert(`${marg.faculty?.name || 'Faculty'}\n${marg.comment}${quote}`);
}

// Make openBookReader available globally
window.openBookReader = openBookReader;

/**
 * Parse book URI to extract source and identifier
 */
function parseBookUri(bookUri) {
    if (!bookUri) return null;
    const parts = bookUri.split('://');
    if (parts.length !== 2) return null;
    return {
        source: parts[0],
        identifier: parts[1]
    };
}

/**
 * Get the appropriate source link for a book
 */
function getBookSourceLink(book) {
    // Try to get source from book_uri first, then fallback to source field
    let source, identifier;
    
    if (book.book_uri) {
        const parsed = parseBookUri(book.book_uri);
        if (parsed) {
            source = parsed.source;
            identifier = parsed.identifier;
        }
    }
    
    // Fallback to source/source_id fields
    if (!source) {
        source = book.source || (book.gutenberg_id ? 'gutenberg' : 'unknown');
        identifier = book.source_id || book.gutenberg_id?.toString();
    }
    
    switch (source) {
        case 'gutenberg':
            if (identifier || book.gutenberg_id) {
                const gutenbergId = identifier || book.gutenberg_id;
                return `<a href="https://www.gutenberg.org/ebooks/${gutenbergId}" target="_blank" class="btn btn-secondary">
                    View on Project Gutenberg
                </a>`;
            }
            break;
        case 'wikibooks':
            if (identifier || book.source_id) {
                const pageTitle = identifier ? decodeURIComponent(identifier) : decodeURIComponent(book.source_id);
                return `<a href="https://en.wikibooks.org/wiki/${encodeURIComponent(pageTitle)}" target="_blank" class="btn btn-secondary">
                    View on Wikibooks
                </a>`;
            }
            break;
        case 'custom':
            // For custom books, you might want to link to your own system
            return `<span class="btn btn-secondary">Custom Book</span>`;
        default:
            return '';
    }
    return '';
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
