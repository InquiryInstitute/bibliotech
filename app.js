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
    
    if (searchEl) searchEl.addEventListener('input', handleSearch);
    if (filterEl) filterEl.addEventListener('change', handleFilter);
    if (closeEl) closeEl.addEventListener('click', closeModal);
    if (modalEl) {
        modalEl.addEventListener('click', (e) => {
            if (e.target.id === 'book-modal') {
                closeModal();
            }
        });
    }

    // Load books
    await loadBooks();
}

/**
 * Load books from Supabase with pagination for performance
 */
async function loadBooks() {
    const loadingEl = document.getElementById('loading');
    const bookshelfEl = document.getElementById('bookshelf');
    const emptyStateEl = document.getElementById('empty-state');

    loadingEl.style.display = 'block';
    bookshelfEl.style.display = 'none';
    emptyStateEl.style.display = 'none';

    try {
        // Load books in batches for better performance
        // Start with first 500 books, load more as needed
        const BATCH_SIZE = 500;
        let allData = [];
        let from = 0;
        let hasMore = true;

        while (hasMore) {
            const { data, error, count } = await supabase
                .from('books')
                .select('id, gutenberg_id, title, author, dewey_decimal, language, subject, publication_date, faculty_id, description', { count: 'exact' })
                .order('dewey_decimal', { ascending: true })
                .order('title', { ascending: true })
                .range(from, from + BATCH_SIZE - 1);

            if (error) {
                throw error;
            }

            if (data && data.length > 0) {
                allData = allData.concat(data);
                from += BATCH_SIZE;
                hasMore = data.length === BATCH_SIZE && (count === null || from < count);
                
                // Update loading message
                if (loadingEl) {
                    loadingEl.querySelector('p').textContent = `Loading books... (${allData.length}${count ? ` of ${count}` : ''})`;
                }
            } else {
                hasMore = false;
            }
        }

        allBooks = allData;
        filteredBooks = [...allBooks];

        loadingEl.style.display = 'none';
        renderBookshelf();
    } catch (error) {
        console.error('Error loading books:', error);
        loadingEl.style.display = 'none';
        showError(`Failed to load books: ${error.message}. Please check your Supabase configuration.`);
    }
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
 * Render a single book spine
 */
function renderBookSpine(book) {
    const title = escapeHtml(book.title || 'Untitled');
    const author = escapeHtml(book.author || 'Unknown');
    const dewey = book.dewey_decimal || '000';
    
    // Generate a color based on Dewey Decimal for visual variety
    const color = getColorForDewey(dewey);
    
    // Truncate title if too long
    const displayTitle = title.length > 30 ? title.substring(0, 27) + '...' : title;
    
    return `
        <div class="book-spine" data-book-id="${book.id}" style="--spine-color: ${color}">
            <div class="spine-content">
                <div class="spine-title">${displayTitle}</div>
                <div class="spine-author">${author}</div>
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
function handleSearch() {
    const query = document.getElementById('search').value.toLowerCase().trim();
    filterBooks();
}

/**
 * Handle Dewey filter
 */
function handleFilter() {
    filterBooks();
}

/**
 * Filter books based on search and category
 */
function filterBooks() {
    const searchQuery = document.getElementById('search').value.toLowerCase().trim();
    const deweyFilter = document.getElementById('dewey-filter').value;

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

    renderBookshelf();
}

/**
 * Show book details in modal
 */
function showBookDetails(book) {
    const modal = document.getElementById('book-modal');
    const detailsEl = document.getElementById('book-details');
    
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
            <a href="https://www.gutenberg.org/ebooks/${book.gutenberg_id}" target="_blank" class="btn btn-primary">
                Read on Project Gutenberg
            </a>
        </div>
    `;
    
    detailsEl.innerHTML = html;
    modal.style.display = 'block';
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
