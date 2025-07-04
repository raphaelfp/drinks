// ===== MODERN DRINKS APP - 2024/2025 =====

class DrinksApp {
    constructor() {
        this.drinks = [];
        this.filteredDrinks = [];
        this.favorites = [];
        this.currentCategory = 'all';
        this.currentGlass = 'all';
        this.currentTechnique = 'all';
        this.searchTerm = '';
        this.isLoading = false;
        
        this.initElements();
        this.init();
    }

    initElements() {
        // DOM Elements
        this.searchInput = document.getElementById('searchInput');
        this.drinksContainer = document.getElementById('drinksContainer');
        this.modal = document.getElementById('drinkModal');
        this.modalTitle = document.getElementById('modalTitle');
        this.modalBody = document.getElementById('modalBody');
        this.closeModalBtn = document.getElementById('closeModal');
        this.loadingState = document.getElementById('loadingState');
        this.emptyState = document.getElementById('emptyState');
        this.fabButton = document.getElementById('fabButton');
        
        // Filter Elements
        this.categoryDropdown = document.getElementById('categoryDropdown');
        this.glassDropdown = document.getElementById('glassDropdown');
        this.techniqueDropdown = document.getElementById('techniqueDropdown');
        this.categoryMenu = document.getElementById('categoryMenu');
        this.glassMenu = document.getElementById('glassMenu');
        this.techniqueMenu = document.getElementById('techniqueMenu');
        this.categoryText = document.getElementById('categoryText');
        this.glassText = document.getElementById('glassText');
        this.techniqueText = document.getElementById('techniqueText');
        this.categoryButtons = document.querySelectorAll('[data-category]');
        this.glassButtons = document.querySelectorAll('[data-glass]');
        this.techniqueButtons = document.querySelectorAll('[data-technique]');
        this.filterCount = document.getElementById('filterCount');
        this.clearFiltersBtn = document.getElementById('clearFilters');
    }

    async init() {
        // Load favorites first
        this.favorites = this.loadFavorites();
        
        // Always start with "all" category - favorites will naturally appear at top
        this.currentCategory = 'all';
        
        this.setupEventListeners();
        this.setupTouchGestures();
        this.setupIntersectionObserver();
        await this.loadDrinks();
        
        // Set up initial filter state
        this.updateDropdownText('category');
        this.updateDropdownText('glass');
        this.updateDropdownText('technique');
        
        // Set active category button
        const activeButton = this.getActiveButton('category', this.currentCategory);
        this.setActiveFilter(activeButton, 'category');
        
        // Initialize PWA
        this.setupServiceWorker();
    }

    setupEventListeners() {
        // Search with debounce
        this.searchInput.addEventListener('input', this.debounce((e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.filterDrinks();
        }, 300));

        // Dropdown toggle events
        this.categoryDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown('category');
        });

        this.glassDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown('glass');
        });

        this.techniqueDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown('technique');
        });

        // Category Filter buttons
        this.categoryButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setActiveFilter(btn, 'category');
                this.currentCategory = btn.dataset.category;
                this.updateDropdownText('category');
                this.filterDrinks();
                this.addMicroInteraction(btn);
                this.closeDropdown('category');
            });
        });

        // Glass Filter buttons
        this.glassButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setActiveFilter(btn, 'glass');
                this.currentGlass = btn.dataset.glass;
                this.updateDropdownText('glass');
                this.filterDrinks();
                this.addMicroInteraction(btn);
                this.closeDropdown('glass');
            });
        });

        // Technique Filter buttons
        this.techniqueButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setActiveFilter(btn, 'technique');
                this.currentTechnique = btn.dataset.technique;
                this.updateDropdownText('technique');
                this.filterDrinks();
                this.addMicroInteraction(btn);
                this.closeDropdown('technique');
            });
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.relative')) {
                this.closeAllDropdowns();
            }
        });

        // Modal close
        this.closeModalBtn.addEventListener('click', () => this.closeModal());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeModal();
        });

        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.modal.classList.contains('hidden')) {
                this.closeModal();
            }
        });

        // FAB button
        this.fabButton.addEventListener('click', () => {
            this.toggleFavorites();
            this.addMicroInteraction(this.fabButton);
        });

        // Clear filters button
        this.clearFiltersBtn.addEventListener('click', () => {
            this.clearAllFilters();
            this.addMicroInteraction(this.clearFiltersBtn);
        });

        // Touch gestures for mobile
        this.setupTouchGestures();
    }

    setupTouchGestures() {
        let startY = 0;
        let startTime = 0;
        
        this.modal.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
            startTime = Date.now();
        });

        this.modal.addEventListener('touchmove', (e) => {
            const currentY = e.touches[0].clientY;
            const diff = currentY - startY;
            
            if (diff > 50 && Date.now() - startTime < 300) {
                this.closeModal();
            }
        });
    }

    setupIntersectionObserver() {
        const options = {
            root: null,
            rootMargin: '50px',
            threshold: 0.1
        };

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-fade-in');
                }
            });
        }, options);
    }

    async setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('./sw.js');
                console.log('Service Worker registered');
            } catch (error) {
                console.log('Service Worker registration failed:', error);
            }
        }
    }

    debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    addMicroInteraction(element) {
        element.classList.add('active-scale');
        setTimeout(() => {
            element.classList.remove('active-scale');
        }, 150);
    }

    // Favorites Management
    loadFavorites() {
        const saved = localStorage.getItem('drinks-favorites');
        return saved ? JSON.parse(saved) : [];
    }

    saveFavorites() {
        localStorage.setItem('drinks-favorites', JSON.stringify(this.favorites));
    }

    toggleFavorite(drinkId) {
        const index = this.favorites.indexOf(drinkId);
        if (index > -1) {
            this.favorites.splice(index, 1);
        } else {
            this.favorites.push(drinkId);
        }
        this.saveFavorites();
        
        const isFavorite = this.favorites.includes(drinkId);
        
        // Update the specific favorite button in the card immediately
        const favoriteBtn = document.querySelector(`button[data-drink-id="${drinkId}"]`);
        if (favoriteBtn) {
            // Create SVG heart directly - filled for favorites, outline for non-favorites
            const heartSvg = isFavorite 
                ? `<svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                     <path stroke-linecap="round" stroke-linejoin="round" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                   </svg>`
                : `<svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                     <path stroke-linecap="round" stroke-linejoin="round" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                   </svg>`;
            
            favoriteBtn.innerHTML = heartSvg;
        }
        
        // Update modal button if open
        const modalBtn = document.querySelector('#drinkModal button[onclick*="toggleFavorite"]');
        if (modalBtn) {
            const isCurrentDrink = modalBtn.onclick.toString().includes(drinkId);
            if (isCurrentDrink) {
                const heartIcon = isFavorite 
                    ? `<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                         <path stroke-linecap="round" stroke-linejoin="round" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                       </svg>`
                    : `<svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                         <path stroke-linecap="round" stroke-linejoin="round" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                       </svg>`;
                
                modalBtn.innerHTML = `
                    ${heartIcon}
                    ${isFavorite ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'}
                `;
            }
        }
        
        // Only re-filter/re-render when necessary:
        // 1. If we're viewing favorites and this item was unfavorited
        // 2. If we're viewing "all" category and need to reorder favorites to top
        const needsRerender = (this.currentCategory === 'favoritos' && !isFavorite) || 
                             (this.currentCategory === 'all');
        
        if (needsRerender) {
            // Use setTimeout to ensure the heart update happens first
            setTimeout(() => {
                this.filterDrinks();
            }, 50);
        }
        
        // Show toast feedback
        this.showToast(isFavorite ? 'Adicionado aos favoritos!' : 'Removido dos favoritos!');
    }

    toggleFavorites() {
        if (this.currentCategory === 'favoritos') {
            this.currentCategory = 'all';
            this.setActiveFilter(document.querySelector('[data-category="all"]'), 'category');
        } else {
            this.currentCategory = 'favoritos';
            this.setActiveFilter(document.querySelector('[data-category="favoritos"]'), 'category');
        }
        this.updateDropdownText('category');
        this.filterDrinks();
    }

    clearAllFilters() {
        this.currentCategory = 'all';
        this.currentGlass = 'all';
        this.currentTechnique = 'all';
        this.searchTerm = '';
        this.searchInput.value = '';
        
        // Reset active filters
        this.setActiveFilter(document.querySelector('[data-category="all"]'), 'category');
        this.setActiveFilter(document.querySelector('[data-glass="all"]'), 'glass');
        this.setActiveFilter(document.querySelector('[data-technique="all"]'), 'technique');
        
        // Update dropdown texts
        this.updateDropdownText('category');
        this.updateDropdownText('glass');
        this.updateDropdownText('technique');
        
        this.filterDrinks();
    }

    toggleDropdown(type) {
        const menu = this.getDropdownMenu(type);
        const isOpen = !menu.classList.contains('hidden');
        
        // Close all dropdowns first
        this.closeAllDropdowns();
        
        // Toggle current dropdown
        if (!isOpen) {
            menu.classList.remove('hidden');
            menu.classList.add('dropdown-enter');
            setTimeout(() => {
                menu.classList.add('dropdown-enter-active');
            }, 10);
        }
    }

    closeDropdown(type) {
        const menu = this.getDropdownMenu(type);
        menu.classList.add('hidden');
        menu.classList.remove('dropdown-enter', 'dropdown-enter-active');
    }

    closeAllDropdowns() {
        this.closeDropdown('category');
        this.closeDropdown('glass');
        this.closeDropdown('technique');
    }

    getDropdownMenu(type) {
        switch (type) {
            case 'category': return this.categoryMenu;
            case 'glass': return this.glassMenu;
            case 'technique': return this.techniqueMenu;
            default: return null;
        }
    }

    updateDropdownText(type) {
        const value = this.getCurrentFilterValue(type);
        const text = this.getDropdownText(type);
        
        if (value === 'all') {
            text.textContent = this.getDefaultText(type);
        } else {
            const button = this.getActiveButton(type, value);
            text.textContent = button ? button.textContent : this.getDefaultText(type);
        }
    }

    getCurrentFilterValue(type) {
        switch (type) {
            case 'category': return this.currentCategory;
            case 'glass': return this.currentGlass;
            case 'technique': return this.currentTechnique;
            default: return 'all';
        }
    }

    getDropdownText(type) {
        switch (type) {
            case 'category': return this.categoryText;
            case 'glass': return this.glassText;
            case 'technique': return this.techniqueText;
            default: return null;
        }
    }

    getDefaultText(type) {
        switch (type) {
            case 'category': return 'Categoria';
            case 'glass': return 'Copo';
            case 'technique': return 'Técnica';
            default: return '';
        }
    }

    getActiveButton(type, value) {
        const buttons = this.getFilterButtons(type);
        return Array.from(buttons).find(btn => btn.dataset[type] === value);
    }

    getFilterButtons(type) {
        switch (type) {
            case 'category': return this.categoryButtons;
            case 'glass': return this.glassButtons;
            case 'technique': return this.techniqueButtons;
            default: return [];
        }
    }

    updateFilterCount() {
        let activeFilters = 0;
        
        // Count active filters
        if (this.currentCategory !== 'all') activeFilters++;
        if (this.currentGlass !== 'all') activeFilters++;
        if (this.currentTechnique !== 'all') activeFilters++;
        if (this.searchTerm !== '') activeFilters++;
        
        if (activeFilters > 0) {
            this.filterCount.textContent = `${activeFilters} ${activeFilters === 1 ? 'ativo' : 'ativos'}`;
            this.filterCount.classList.remove('hidden');
            this.clearFiltersBtn.classList.remove('hidden');
        } else {
            this.filterCount.classList.add('hidden');
            this.clearFiltersBtn.classList.add('hidden');
        }
    }

    // Data Loading
    async loadDrinks() {
        this.showLoading();
        
        try {
            // Simulate API call delay for better UX
            await new Promise(resolve => setTimeout(resolve, 500));
            
            this.drinks = window.drinksData || [];
            this.filterDrinks();
        } catch (error) {
            console.error('Error loading drinks:', error);
            this.showError('Erro ao carregar os drinks. Tente novamente.');
        } finally {
            this.hideLoading();
        }
    }

    // Filtering
    filterDrinks() {
        this.filteredDrinks = this.drinks.filter(drink => {
            const matchesSearch = drink.nome.toLowerCase().includes(this.searchTerm) ||
                                drink.categoria.toLowerCase().includes(this.searchTerm) ||
                                drink.descricao.toLowerCase().includes(this.searchTerm);
            
            const matchesCategory = this.currentCategory === 'all' || 
                                  this.currentCategory === 'favoritos' && this.favorites.includes(drink.id) ||
                                  drink.categoria === this.currentCategory;

            const matchesGlass = this.currentGlass === 'all' ||
                               (drink.glass && drink.glass.toLowerCase().includes(this.currentGlass.toLowerCase()));

            const matchesTechnique = this.currentTechnique === 'all' ||
                                   (drink.technique && drink.technique.toLowerCase().includes(this.currentTechnique.toLowerCase()));
            
            return matchesSearch && matchesCategory && matchesGlass && matchesTechnique;
        });

        // Apply sorting based on current category
        if (this.currentCategory === 'all') {
            // For "all" category: favorites first (alphabetically), then non-favorites (alphabetically)
            this.filteredDrinks.sort((a, b) => {
                const aIsFavorite = this.favorites.includes(a.id);
                const bIsFavorite = this.favorites.includes(b.id);
                
                // If both are favorites or both are not favorites, sort alphabetically
                if (aIsFavorite === bIsFavorite) {
                    return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
                }
                
                // Favorites come first
                return aIsFavorite ? -1 : 1;
            });
        } else {
            // For other categories (including favorites): simple alphabetical order
            this.filteredDrinks.sort((a, b) => {
                return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
            });
        }

        this.renderDrinks();
        this.updateFilterCount();
    }

    setActiveFilter(activeButton, filterType) {
        if (filterType === 'category') {
            this.categoryButtons.forEach(btn => btn.classList.remove('active'));
        } else if (filterType === 'glass') {
            this.glassButtons.forEach(btn => btn.classList.remove('active'));
        } else if (filterType === 'technique') {
            this.techniqueButtons.forEach(btn => btn.classList.remove('active'));
        }
        
        if (activeButton) {
            activeButton.classList.add('active');
        }
    }

    // Rendering
    renderDrinks() {
        if (this.filteredDrinks.length === 0) {
            this.showEmptyState();
            return;
        }

        this.hideEmptyState();
        
        const cardsHTML = this.filteredDrinks.map(drink => this.createDrinkCard(drink)).join('');
        this.drinksContainer.innerHTML = cardsHTML;
        
        // Initialize Lucide icons for the newly rendered cards
        setTimeout(() => {
            lucide.createIcons();
        }, 10);
        
        // Setup intersection observer for animations
        this.drinksContainer.querySelectorAll('.drink-card').forEach(card => {
            this.observer.observe(card);
        });
    }

    createDrinkCard(drink) {
        const isFavorite = this.favorites.includes(drink.id);
        
        // Create SVG heart that changes based on favorite status
        const heartSvg = isFavorite 
            ? `<svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                 <path stroke-linecap="round" stroke-linejoin="round" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
               </svg>`
            : `<svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                 <path stroke-linecap="round" stroke-linejoin="round" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
               </svg>`;
        
        // Choose between image or emoji
        const drinkVisual = drink.imagem 
            ? `<img 
                 src="${drink.imagem}" 
                 alt="${drink.nome}"
                 class="w-full h-full object-cover rounded-t-2xl"
                 loading="lazy"
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
               >
               <div class="hidden w-full h-full flex items-center justify-center text-4xl">
                 ${drink.emoji || '🍹'}
               </div>`
            : `<div class="w-full h-full flex items-center justify-center text-4xl">
                 ${drink.emoji || '🍹'}
               </div>`;
        
        return `
            <div class="drink-card cursor-pointer" data-drink-id="${drink.id}" onclick="app.openModal('${drink.id}')">
                <div class="drink-card-image">
                    ${drinkVisual}
                    <button 
                        class="absolute top-3 right-3 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white hover:scale-110 transition-all duration-200 shadow-lg"
                        onclick="event.stopPropagation(); app.toggleFavorite('${drink.id}')"
                        aria-label="Favoritar drink"
                        data-drink-id="${drink.id}"
                    >
                        ${heartSvg}
                    </button>
                </div>
                
                <div class="drink-card-content">
                    <div class="flex flex-wrap gap-2 mb-3">
                        <span class="drink-badge drink-badge-category">
                            <i data-lucide="tag" class="w-3 h-3"></i>
                            ${drink.categoria}
                        </span>
                        ${drink.glass ? `
                            <span class="drink-badge drink-badge-glass">
                                <i data-lucide="wine" class="w-3 h-3"></i>
                                ${drink.glass}
                            </span>
                        ` : ''}
                        ${drink.technique ? `
                            <span class="drink-badge drink-badge-technique">
                                <i data-lucide="zap" class="w-3 h-3"></i>
                                ${drink.technique}
                            </span>
                        ` : ''}
                    </div>
                    
                    <h3 class="drink-card-title">
                        ${drink.nome}
                    </h3>
                    
                    <p class="drink-card-description">
                        ${drink.descricao || 'Um drink especial para você descobrir.'}
                    </p>
                </div>
            </div>
        `;
    }

    // Modal Management
    openModal(drinkId) {
        const drink = this.drinks.find(d => d.id === drinkId);
        if (!drink) return;

        this.currentDrink = drink; // Store current drink for image toggle
        this.modalTitle.textContent = drink.nome;
        this.modalBody.innerHTML = this.createModalContent(drink);
        
        this.modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        // Initialize icons for modal content
        lucide.createIcons();
        
        // Add opening animation
        setTimeout(() => {
            this.modal.querySelector('.relative').classList.add('animate-slide-up');
        }, 10);
    }

    closeModal() {
        const modalContent = this.modal.querySelector('.relative');
        modalContent.classList.add('closing');
        
        setTimeout(() => {
            this.modal.classList.add('hidden');
            modalContent.classList.remove('closing', 'animate-slide-up');
            document.body.style.overflow = 'auto';
            this.currentDrink = null; // Clear current drink
        }, 300);
    }

    // Toggle between recipe and image view
    toggleImageView() {
        if (!this.currentDrink || !this.currentDrink.imagem) return;
        
        const modalBody = this.modalBody;
        const isImageView = modalBody.classList.contains('image-view');
        
        if (isImageView) {
            // Back to recipe view
            modalBody.classList.remove('image-view');
            modalBody.innerHTML = this.createModalContent(this.currentDrink);
            lucide.createIcons();
        } else {
            // Switch to image view
            modalBody.classList.add('image-view');
            modalBody.innerHTML = this.createImageContent(this.currentDrink);
        }
    }

    // Create image view content
    createImageContent(drink) {
        return `
            <div class="flex flex-col items-center justify-center h-full min-h-[400px] cursor-pointer" onclick="app.toggleImageView()">
                <div class="relative w-full max-w-lg group">
                    <img 
                        src="${drink.imagem}" 
                        alt="${drink.nome}"
                        class="w-full h-auto rounded-2xl shadow-2xl transition-transform duration-300 hover:scale-105"
                        loading="lazy"
                    >
                    <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 rounded-2xl flex items-center justify-center">
                        <div class="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 backdrop-blur-sm rounded-full p-3">
                            <svg class="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    createModalContent(drink) {
        const ingredients = drink.ingredientes || [];
        const preparation = drink.preparo || [];
        const isFavorite = this.favorites.includes(drink.id);
        
        // Create SVG heart for modal button
        const heartIcon = isFavorite 
            ? `<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                 <path stroke-linecap="round" stroke-linejoin="round" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
               </svg>`
            : `<svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                 <path stroke-linecap="round" stroke-linejoin="round" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
               </svg>`;
        
        return `
            <div class="space-y-4">
                <!-- Drink Info -->
                <div class="flex flex-wrap gap-2">
                    <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                        <i data-lucide="tag" class="w-3 h-3"></i>
                        ${drink.categoria}
                    </span>
                    ${drink.glass ? `
                        <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <i data-lucide="wine" class="w-3 h-3"></i>
                            ${drink.glass}
                        </span>
                    ` : ''}
                    ${drink.technique ? `
                        <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <i data-lucide="zap" class="w-3 h-3"></i>
                            ${drink.technique}
                        </span>
                    ` : ''}
                </div>

                <!-- Description -->
                ${drink.descricao ? `
                    <div class="p-4 bg-gray-50 rounded-xl">
                        <p class="text-gray-700 leading-relaxed">
                            ${drink.descricao}
                        </p>
                    </div>
                ` : ''}

                <!-- Ingredients -->
                <div>
                    <h3 class="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <i data-lucide="shopping-cart" class="w-5 h-5 text-primary-500"></i>
                        Ingredientes
                    </h3>
                    <ol class="list-decimal list-inside space-y-1 text-gray-700">
                        ${ingredients.map(ingredient => `
                            <li class="leading-relaxed">${ingredient}</li>
                        `).join('')}
                    </ol>
                </div>

                <!-- Preparation -->
                ${preparation.length > 0 ? `
                    <div>
                        <h3 class="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <i data-lucide="chef-hat" class="w-5 h-5 text-primary-500"></i>
                            Modo de Preparo
                        </h3>
                        <ol class="list-decimal list-inside space-y-2 text-gray-700">
                            ${preparation.map(step => `
                                <li class="leading-relaxed">${step}</li>
                            `).join('')}
                        </ol>
                    </div>
                ` : ''}

                <!-- Action Buttons -->
                <div class="flex gap-3 pt-3">
                    <button 
                        class="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-accent-500 hover:bg-accent-600 text-white rounded-xl font-medium transition-colors duration-200 active-scale"
                        onclick="app.toggleFavorite('${drink.id}')"
                    >
                        ${heartIcon}
                        ${isFavorite ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'}
                    </button>
                    
                    ${drink.imagem ? `
                        <button 
                            class="flex items-center justify-center gap-2 px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-colors duration-200 active-scale"
                            onclick="app.toggleImageView()"
                            title="Ver imagem do drink"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                            Ver Imagem
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // Utility Methods
    showLoading() {
        this.loadingState.classList.remove('hidden');
        this.drinksContainer.classList.add('hidden');
        this.emptyState.classList.add('hidden');
    }

    hideLoading() {
        this.loadingState.classList.add('hidden');
        this.drinksContainer.classList.remove('hidden');
    }

    showEmptyState() {
        this.emptyState.classList.remove('hidden');
        this.drinksContainer.classList.add('hidden');
    }

    hideEmptyState() {
        this.emptyState.classList.add('hidden');
        this.drinksContainer.classList.remove('hidden');
    }

    showError(message) {
        console.error(message);
        // You could implement a toast notification here
    }

    showToast(message) {
        // Simple toast implementation
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg z-50';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new DrinksApp();
});

// PWA Install Prompt
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Show custom install prompt
    const installButton = document.createElement('button');
    installButton.textContent = 'Instalar App';
    installButton.className = 'fixed top-4 right-4 bg-primary-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    installButton.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                installButton.remove();
            }
            deferredPrompt = null;
        }
    });
    
    document.body.appendChild(installButton);
});

// Handle app updates
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
    });
} 