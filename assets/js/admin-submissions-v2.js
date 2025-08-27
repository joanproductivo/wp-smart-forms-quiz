/**
 * Smart Forms & Quiz - Admin Submissions JavaScript V2
 * Funcionalidad avanzada para la página de respuestas mejorada
 */

(function($) {
    'use strict';

    // Configuración y constantes consolidadas
    const CONFIG = {
        DEFAULT_PER_PAGE: 25,
        DEFAULT_SORT: { column: 'completed_at', direction: 'DESC' },
        ANIMATION_DURATION: 1000,
        CACHE_DURATION: 5 * 60 * 1000, // 5 minutos
        CHART_COLORS: [
            '#007cba', '#46b450', '#ffb900', '#dc3232', 
            '#00a0d2', '#6c757d', '#9b59b6', '#e67e22', 
            '#1abc9c', '#34495e'
        ],
        DEBOUNCE_DELAY: 300,
        MAX_RETRIES: 3,
        TIMEOUT: 30000
    };

    // Estado de la aplicación centralizado
    const AppState = {
        currentPage: 1,
        currentPerPage: CONFIG.DEFAULT_PER_PAGE,
        currentSort: { ...CONFIG.DEFAULT_SORT },
        currentFilters: {},
        submissionsData: [],
        chartsInstances: {},
        isLoading: false,
        cache: new Map(),
        domCache: new Map(), // Cache para elementos DOM
        retryCount: 0
    };

    // Sistema de eventos centralizado
    const EventBus = {
        events: {},
        
        on: function(event, callback) {
            if (!this.events[event]) {
                this.events[event] = [];
            }
            this.events[event].push(callback);
        },
        
        emit: function(event, data) {
            if (this.events[event]) {
                this.events[event].forEach(callback => callback(data));
            }
        },
        
        off: function(event, callback) {
            if (this.events[event]) {
                this.events[event] = this.events[event].filter(cb => cb !== callback);
            }
        }
    };

    // Utilidades centralizadas y optimizadas
    const Utils = {
        // Cache de elementos DOM
        getElement: function(selector) {
            if (!AppState.domCache.has(selector)) {
                AppState.domCache.set(selector, $(selector));
            }
            return AppState.domCache.get(selector);
        },

        // Debounce function
        debounce: function(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        // Escape HTML
        escapeHtml: function(text) {
            const map = {
                '&': '&amp;', '<': '&lt;', '>': '&gt;',
                '"': '&quot;', "'": '&#039;'
            };
            return text ? text.replace(/[&<>"']/g, m => map[m]) : '';
        },

        // Limpiar cache DOM cuando sea necesario
        clearDomCache: function() {
            AppState.domCache.clear();
        },

        // Método unificado para actualizar elementos de texto
        updateTextContent: function(selector, content) {
            this.getElement(selector).text(content);
        },

        // Método unificado para mostrar/ocultar elementos
        toggleElement: function(selector, show) {
            this.getElement(selector).toggle(show);
        }
    };

    // Sistema AJAX unificado y optimizado
    const AjaxManager = {
        activeRequests: new Map(),
        
        request: function(action, data = {}, options = {}) {
            const defaultOptions = {
                showLoading: true,
                showSuccess: true,
                showError: true,
                cache: false,
                timeout: CONFIG.TIMEOUT,
                retries: CONFIG.MAX_RETRIES
            };
            
            const opts = { ...defaultOptions, ...options };
            const requestKey = `${action}_${JSON.stringify(data)}`;
            
            // Cancelar request anterior si existe
            if (this.activeRequests.has(requestKey)) {
                this.activeRequests.get(requestKey).abort();
            }
            
            // Verificar cache si está habilitado
            if (opts.cache && AppState.cache.has(requestKey)) {
                const cached = AppState.cache.get(requestKey);
                if (Date.now() - cached.timestamp < CONFIG.CACHE_DURATION) {
                    return Promise.resolve(cached.data);
                }
            }
            
            if (opts.showLoading) {
                this.showLoading();
            }

            const request = $.ajax({
                url: ajaxurl,
                type: 'POST',
                timeout: opts.timeout,
                data: {
                    action: action,
                    nonce: sfq_ajax.nonce,
                    ...data
                }
            });

            this.activeRequests.set(requestKey, request);

            return request.done((response) => {
                if (response.success) {
                    // Cachear respuesta si está habilitado
                    if (opts.cache) {
                        AppState.cache.set(requestKey, {
                            data: response,
                            timestamp: Date.now()
                        });
                    }
                    
                    if (opts.showSuccess && response.data?.message) {
                        NotificationManager.show(response.data.message, 'success');
                    }
                    
                    EventBus.emit('ajax:success', { action, response });
                } else {
                    if (opts.showError) {
                        NotificationManager.show('Error: ' + (response.data?.message || 'Error desconocido'), 'error');
                    }
                    EventBus.emit('ajax:error', { action, response });
                }
            }).fail((xhr, status, error) => {
                if (status !== 'abort') {
                    if (AppState.retryCount < opts.retries) {
                        AppState.retryCount++;
                        setTimeout(() => this.request(action, data, opts), 1000 * AppState.retryCount);
                        return;
                    }
                    
                    if (opts.showError) {
                        NotificationManager.show('Error de conexión: ' + error, 'error');
                    }
                    EventBus.emit('ajax:fail', { action, error });
                }
            }).always(() => {
                this.activeRequests.delete(requestKey);
                AppState.retryCount = 0;
                
                if (opts.showLoading) {
                    this.hideLoading();
                }
            });
        },

        showLoading: function() {
            this.toggleLoading(true);
        },

        hideLoading: function() {
            this.toggleLoading(false);
        },

        toggleLoading: function(show) {
            if (AppState.isLoading !== show) {
                AppState.isLoading = show;
                Utils.toggleElement('.sfq-loading-overlay', show);
                EventBus.emit(show ? 'loading:start' : 'loading:end');
            }
        },

        cancelAll: function() {
            this.activeRequests.forEach(request => request.abort());
            this.activeRequests.clear();
        }
    };

    // Sistema de notificaciones mejorado
    const NotificationManager = {
        queue: [],
        maxVisible: 3,
        
        show: function(message, type = 'info', duration = 4000) {
            const notification = {
                id: Date.now() + Math.random(),
                message: Utils.escapeHtml(message),
                type: type,
                duration: duration
            };
            
            this.queue.push(notification);
            this.processQueue();
        },

        processQueue: function() {
            const visibleCount = $('.sfq-notification').length;
            
            if (visibleCount < this.maxVisible && this.queue.length > 0) {
                const notification = this.queue.shift();
                this.render(notification);
            }
        },

        render: function(notification) {
            const $notification = $(`
                <div class="sfq-notification sfq-notification-${notification.type}" data-id="${notification.id}">
                    <span class="sfq-notification-message">${notification.message}</span>
                    <button class="sfq-notification-close" type="button">&times;</button>
                </div>
            `);

            $('body').append($notification);

            // Animación de entrada
            setTimeout(() => $notification.addClass('show'), 100);

            // Auto-remove
            setTimeout(() => {
                this.remove(notification.id);
            }, notification.duration);

            // Click para cerrar
            $notification.find('.sfq-notification-close').on('click', () => {
                this.remove(notification.id);
            });
        },

        remove: function(id) {
            const $notification = $(`.sfq-notification[data-id="${id}"]`);
            if ($notification.length) {
                $notification.removeClass('show');
                setTimeout(() => {
                    $notification.remove();
                    this.processQueue(); // Procesar siguiente en cola
                }, 300);
            }
        },

        clear: function() {
            $('.sfq-notification').remove();
            this.queue = [];
        }
    };

    // Gestor de Dashboard
    const DashboardManager = {
        updateStats: function(data) {
            // Actualizar estadísticas principales usando métodos unificados
            Utils.updateTextContent('#total-submissions .sfq-stat-number', data.total_submissions);
            Utils.updateTextContent('#today-submissions .sfq-stat-number', data.today_submissions);
            Utils.updateTextContent('#avg-completion-time .sfq-stat-number', data.avg_completion_time);
            Utils.updateTextContent('#conversion-rate .sfq-stat-number', data.conversion_rate + '%');

            // Actualizar indicador de cambio
            this.updateChangeIndicator(data.today_change);
            this.animateNumbers();
        },

        updateChangeIndicator: function(change) {
            const changeClass = change > 0 ? 'positive' : (change < 0 ? 'negative' : 'neutral');
            const changeSymbol = change > 0 ? '+' : '';
            const $changeElement = Utils.getElement('#today-submissions .sfq-stat-change');
            
            $changeElement
                .text(changeSymbol + change + '%')
                .removeClass('positive negative neutral')
                .addClass(changeClass);
        },

        animateNumbers: function() {
            Utils.getElement('.sfq-stat-number').each(function() {
                const $this = $(this);
                const text = $this.text();
                const number = parseInt(text.replace(/[^\d]/g, ''));
                
                if (!isNaN(number) && number > 0) {
                    $this.prop('Counter', 0).animate({
                        Counter: number
                    }, {
                        duration: CONFIG.ANIMATION_DURATION,
                        easing: 'swing',
                        step: function(now) {
                            const formatted = Math.ceil(now).toLocaleString();
                            $this.text(text.replace(/[\d,]+/, formatted));
                        }
                    });
                }
            });
        }
    };

    // Gestor de Gráficos
    const ChartManager = {
        // Configuraciones base para diferentes tipos de gráficos
        chartConfigs: {
            submissions: {
                type: 'line',
                options: {
                    plugins: { legend: { display: false } },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { stepSize: 1 }
                        }
                    }
                },
                dataset: {
                    label: 'Respuestas',
                    borderColor: CONFIG.CHART_COLORS[0],
                    backgroundColor: 'rgba(0, 124, 186, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }
            },
            doughnut: {
                type: 'doughnut',
                options: {
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { padding: 20, usePointStyle: true }
                        }
                    }
                },
                dataset: {
                    borderWidth: 0
                }
            }
        },

        // Método unificado para crear gráficos
        createChart: function(canvasId, chartKey, config = {}) {
            const ctx = document.getElementById(canvasId);
            if (!ctx) return null;

            const baseConfig = this.chartConfigs[chartKey];
            const chartConfig = {
                type: baseConfig.type,
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        ...baseConfig.dataset,
                        ...config.dataset
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    ...baseConfig.options,
                    ...config.options
                }
            };

            return new Chart(ctx, chartConfig);
        },

        initSubmissionsChart: function() {
            AppState.chartsInstances.submissions = this.createChart('sfq-submissions-chart', 'submissions');
        },

        initFormsChart: function() {
            AppState.chartsInstances.forms = this.createChart('sfq-forms-chart', 'doughnut', {
                dataset: { backgroundColor: CONFIG.CHART_COLORS.slice(0, 6) }
            });
        },

        initCountriesChart: function() {
            AppState.chartsInstances.countries = this.createChart('sfq-countries-chart', 'doughnut', {
                dataset: { backgroundColor: CONFIG.CHART_COLORS },
                options: {
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { padding: 20, usePointStyle: true }
                        },
                        tooltip: {
                            callbacks: {
                                title: function(context) {
                                    return context[0].label;
                                },
                                label: function(context) {
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((context.parsed / total) * 100).toFixed(1);
                                    return `${context.parsed} respuestas (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        },

        // Método unificado para actualizar datos de gráficos
        updateChartData: function(chartInstance, labels, values) {
            if (!chartInstance || !labels || !values) return;
            
            chartInstance.data.labels = labels;
            chartInstance.data.datasets[0].data = values;
            chartInstance.update();
        },

        updateCharts: function(data) {
            this.updateSubmissionsChart(data.daily_submissions);
            this.updateFormsChart(data.popular_forms);
            this.updateCountriesChart(data.countries_data);
        },

        updateSubmissionsChart: function(data) {
            if (!data) return;
            
            const labels = data.map(item => {
                const date = new Date(item.date);
                return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
            });
            const values = data.map(item => parseInt(item.count));
            
            this.updateChartData(AppState.chartsInstances.submissions, labels, values);
        },

        updateFormsChart: function(data) {
            if (!data) return;
            
            const labels = data.map(item => item.title);
            const values = data.map(item => parseInt(item.submissions));
            
            this.updateChartData(AppState.chartsInstances.forms, labels, values);
        },

        updateCountriesChart: function(data) {
            if (!data) return;
            
            const countriesArray = Array.isArray(data) ? data : Object.values(data);
            
            if (countriesArray.length > 0) {
                const labels = countriesArray.map(item => `${item.flag_emoji} ${item.country_name}`);
                const values = countriesArray.map(item => parseInt(item.count));
                
                this.updateChartData(AppState.chartsInstances.countries, labels, values);
            }
        }
    };

    // Gestor de Tabla
    const TableManager = {
        // Elementos DOM cacheados
        get tbody() {
            return Utils.getElement('#sfq-submissions-tbody-advanced');
        },

        get selectAllCheckbox() {
            return Utils.getElement('#sfq-select-all');
        },

        showLoading: function() {
            const loadingRow = `
                <tr class="sfq-loading-row">
                    <td colspan="9" class="sfq-loading-cell">
                        <div class="sfq-loading-content">
                            <div class="sfq-loading-spinner"></div>
                            <span>Cargando respuestas...</span>
                        </div>
                    </td>
                </tr>
            `;
            this.tbody.html(loadingRow);
        },

        hideLoading: function() {
            Utils.getElement('.sfq-loading-row').remove();
        },

        render: function(data) {
            this.tbody.empty();

            if (!data.submissions || data.submissions.length === 0) {
                this.renderEmptyState();
                return;
            }

            // Usar DocumentFragment para mejor rendimiento
            const fragment = document.createDocumentFragment();
            data.submissions.forEach((submission, index) => {
                const rowElement = this.createSubmissionRowElement(submission, index);
                fragment.appendChild(rowElement);
            });

            this.tbody[0].appendChild(fragment);
            this.updateSortIndicators();
        },

        renderEmptyState: function() {
            this.tbody.html(`
                <tr>
                    <td colspan="9" class="sfq-text-center" style="padding: 40px;">
                        <p>No se encontraron respuestas con los filtros aplicados.</p>
                    </td>
                </tr>
            `);
        },

        createSubmissionRowElement: function(submission, index) {
            const tr = document.createElement('tr');
            tr.setAttribute('data-submission-id', submission.id);
            tr.setAttribute('data-index', index);
            tr.innerHTML = this.createSubmissionRowHTML(submission, index);
            return tr;
        },

        createSubmissionRowHTML: function(submission, index) {
            const badges = this.createBadges(submission);
            
            return `
                <td class="check-column">
                    <input type="checkbox" class="sfq-submission-checkbox" value="${submission.id}">
                </td>
                <td><strong>#${submission.id}</strong></td>
                <td><strong>${Utils.escapeHtml(submission.form_title || 'Sin título')}</strong></td>
                <td>
                    <div class="sfq-user-info">
                        <strong>${Utils.escapeHtml(submission.user_name)}</strong>
                        ${badges.user}
                        ${badges.country}
                    </div>
                </td>
                <td><div class="sfq-date-info"><strong>${submission.formatted_date}</strong></div></td>
                <td><span class="sfq-time-badge">${submission.time_spent_formatted}</span></td>
                <td><span class="sfq-responses-count">${submission.response_count}</span></td>
                <td>${badges.score}</td>
                <td>
                    <div class="sfq-row-actions">
                        ${this.createActionButtons(submission.id, index)}
                    </div>
                </td>
            `;
        },

        createBadges: function(submission) {
            const userBadge = submission.user_type === 'registered' 
                ? '<span class="sfq-badge sfq-badge-success">Registrado</span>'
                : '<span class="sfq-badge sfq-badge-secondary">Anónimo</span>';

            const scoreBadge = submission.total_score > 0 
                ? `<span class="sfq-score-badge">${submission.total_score}</span>`
                : '-';

            const countryInfo = submission.country_info || { flag_emoji: '🌍', country_name: 'Desconocido' };
            const countryBadge = `<span class="sfq-country-badge" title="${Utils.escapeHtml(countryInfo.country_name)}">${countryInfo.flag_emoji}</span>`;

            return {
                user: userBadge,
                score: scoreBadge,
                country: countryBadge
            };
        },

        createActionButtons: function(submissionId, index) {
            return `
                <button class="button button-small sfq-view-submission" 
                        data-submission-id="${submissionId}" 
                        data-index="${index}"
                        title="Ver detalles">
                    <span class="dashicons dashicons-visibility"></span>
                </button>
                <button class="button button-small sfq-delete-submission" 
                        data-submission-id="${submissionId}"
                        title="Eliminar">
                    <span class="dashicons dashicons-trash"></span>
                </button>
            `;
        },

        updateResultsCount: function(total) {
            Utils.updateTextContent('#sfq-results-count', total.toLocaleString());
        },

        toggleSelectAll: function() {
            const isChecked = this.selectAllCheckbox.is(':checked');
            Utils.getElement('.sfq-submission-checkbox').prop('checked', isChecked);
            this.updateBulkActions();
        },

        updateBulkActions: function() {
            const checkedCount = Utils.getElement('.sfq-submission-checkbox:checked').length;
            Utils.toggleElement('.sfq-bulk-actions', checkedCount > 0);
        },

        handleSort: function(e) {
            const column = $(e.target).closest('.sfq-sortable').data('column');
            
            if (AppState.currentSort.column === column) {
                AppState.currentSort.direction = AppState.currentSort.direction === 'ASC' ? 'DESC' : 'ASC';
            } else {
                AppState.currentSort.column = column;
                AppState.currentSort.direction = 'DESC';
            }

            AppState.currentPage = 1;
            SubmissionsApp.loadSubmissions();
        },

        updateSortIndicators: function() {
            const sortableElements = Utils.getElement('.sfq-sortable');
            sortableElements.removeClass('sorted asc desc');
            
            const currentSortElement = Utils.getElement(`.sfq-sortable[data-column="${AppState.currentSort.column}"]`);
            currentSortElement
                .addClass('sorted')
                .addClass(AppState.currentSort.direction.toLowerCase());
        }
    };

    // Gestor de Paginación
    const PaginationManager = {
        render: function(data) {
            const container = $('#sfq-pagination-controls');
            container.empty();

            if (data.pages <= 1) return;

            // Botón anterior
            if (data.current_page > 1) {
                container.append(`
                    <button class="button sfq-page-btn" data-page="${data.current_page - 1}">
                        <span class="dashicons dashicons-arrow-left-alt2"></span>
                    </button>
                `);
            }

            // Páginas
            const startPage = Math.max(1, data.current_page - 2);
            const endPage = Math.min(data.pages, data.current_page + 2);

            if (startPage > 1) {
                container.append(`<button class="button sfq-page-btn" data-page="1">1</button>`);
                if (startPage > 2) {
                    container.append(`<span class="sfq-pagination-dots">...</span>`);
                }
            }

            for (let i = startPage; i <= endPage; i++) {
                const isActive = i === data.current_page ? 'current' : '';
                container.append(`
                    <button class="button sfq-page-btn ${isActive}" data-page="${i}" ${isActive ? 'disabled' : ''}>
                        ${i}
                    </button>
                `);
            }

            if (endPage < data.pages) {
                if (endPage < data.pages - 1) {
                    container.append(`<span class="sfq-pagination-dots">...</span>`);
                }
                container.append(`<button class="button sfq-page-btn" data-page="${data.pages}">${data.pages}</button>`);
            }

            // Botón siguiente
            if (data.current_page < data.pages) {
                container.append(`
                    <button class="button sfq-page-btn" data-page="${data.current_page + 1}">
                        <span class="dashicons dashicons-arrow-right-alt2"></span>
                    </button>
                `);
            }

            // Actualizar info de paginación
            const start = ((data.current_page - 1) * data.per_page) + 1;
            const end = Math.min(data.current_page * data.per_page, data.total);
            $('#sfq-pagination-text').text(`Mostrando ${start}-${end} de ${data.total}`);
        },

        changePage: function(e) {
            const page = parseInt($(e.target).closest('.sfq-page-btn').data('page'));
            if (page && page !== AppState.currentPage) {
                AppState.currentPage = page;
                SubmissionsApp.loadSubmissions();
            }
        },

        changePerPage: function(e) {
            AppState.currentPerPage = parseInt($(e.target).val());
            AppState.currentPage = 1;
            SubmissionsApp.loadSubmissions();
        }
    };

    // Gestor de Filtros
    const FilterManager = {
        filterSelectors: [
            '#sfq-filter-form', '#sfq-filter-date-from', '#sfq-filter-date-to', 
            '#sfq-filter-user', '#sfq-filter-status', '#sfq-filter-time-min', 
            '#sfq-filter-time-max', '#sfq-filter-search'
        ],

        filterKeys: [
            'form_id', 'date_from', 'date_to', 'user_type', 
            'status', 'time_min', 'time_max', 'search'
        ],

        collectFilters: function() {
            const filters = {};
            this.filterKeys.forEach((key, index) => {
                const value = $(this.filterSelectors[index]).val();
                if (value) {
                    filters[key] = value;
                }
            });
            return filters;
        },

        apply: function() {
            AppState.currentFilters = this.collectFilters();
            AppState.currentPage = 1;
            SubmissionsApp.loadSubmissions();
        },

        clear: function() {
            this.filterSelectors.forEach(selector => $(selector).val(''));
            AppState.currentFilters = {};
            AppState.currentPage = 1;
            SubmissionsApp.loadSubmissions();
        },

        save: function() {
            const filterName = prompt('Nombre para este filtro:');
            if (!filterName) return;

            const savedFilters = JSON.parse(localStorage.getItem('sfq_saved_filters') || '{}');
            savedFilters[filterName] = AppState.currentFilters;
            localStorage.setItem('sfq_saved_filters', JSON.stringify(savedFilters));
            
            NotificationManager.show('Filtro guardado: ' + filterName, 'success');
        }
    };

    // Gestor de Modales
    const ModalManager = {
        close: function() {
            $('.sfq-modal-v2').hide();
        },

        showSubmissionDetail: function(e) {
            const submissionId = $(e.target).closest('.sfq-view-submission').data('submission-id');
            const index = $(e.target).closest('.sfq-view-submission').data('index');
            
            this.loadSubmissionDetail(submissionId, index);
        },

        loadSubmissionDetail: function(submissionId, index) {
            AjaxManager.request('sfq_get_submission_detail', { submission_id: submissionId }, { showLoading: false })
                .done((response) => {
                    if (response.success) {
                        this.renderSubmissionDetail(response.data, index);
                        $('#sfq-submission-modal-v2').show();
                    }
                });
        },

        renderSubmissionDetail: function(data, index) {
            const submission = data.submission;
            const responses = data.responses;

            $('#sfq-modal-subtitle').text(`#${submission.id} - ${submission.form_title}`);

            const $infoContainer = $('#sfq-submission-info-v2');
            $infoContainer.empty();
            
            $infoContainer.append($('<h4>').text('Información General'));
            $infoContainer.append($('<p>').html($('<strong>').text('Formulario: ')).append(document.createTextNode(submission.form_title || 'Sin título')));
            $infoContainer.append($('<p>').html($('<strong>').text('Usuario: ')).append(document.createTextNode(submission.user_name || 'Anónimo')));        
            $infoContainer.append($('<p>').html($('<strong>').text('Fecha: ')).append(document.createTextNode(submission.formatted_date || '-')));
            $infoContainer.append($('<p>').html($('<strong>').text('Tiempo: ')).append(document.createTextNode(submission.time_spent_formatted || '-')));
            $infoContainer.append($('<p>').html($('<strong>').text('IP: ')).append(document.createTextNode(submission.user_ip || '-')));
            
            if (submission.total_score > 0) {
                $infoContainer.append($('<p>').html($('<strong>').text('Puntuación: ')).append(document.createTextNode(submission.total_score)));
            }

            $('#sfq-submission-notes').val(submission.admin_note || '');

            let responsesHtml = '';
            if (responses && responses.length > 0) {
                responses.forEach(function(response) {
                    responsesHtml += `
                        <div class="sfq-response-item">
                            <div class="sfq-response-question">${Utils.escapeHtml(response.question_text)}</div>
                            <div class="sfq-response-answer">${Utils.escapeHtml(response.answer_formatted)}</div>
                        </div>
                    `;
                });
            } else {
                responsesHtml = '<p class="sfq-text-muted">No hay respuestas disponibles.</p>';
            }
            $('#sfq-responses-container-v2').html(responsesHtml);

            this.setupNavigation(submission.id, index);
        },

        setupNavigation: function(currentId, currentIndex) {
            $('#sfq-prev-submission').prop('disabled', currentIndex <= 0).data('index', currentIndex - 1);
            $('#sfq-next-submission').prop('disabled', currentIndex >= AppState.submissionsData.length - 1).data('index', currentIndex + 1);
            $('#sfq-submission-modal-v2').data('current-id', currentId).data('current-index', currentIndex);
        },

        showPrev: function() {
            const index = $('#sfq-prev-submission').data('index');
            if (index >= 0 && AppState.submissionsData[index]) {
                this.loadSubmissionDetail(AppState.submissionsData[index].id, index);
            }
        },

        showNext: function() {
            const index = $('#sfq-next-submission').data('index');
            if (index < AppState.submissionsData.length && AppState.submissionsData[index]) {
                this.loadSubmissionDetail(AppState.submissionsData[index].id, index);
            }
        }
    };

    // Gestor de Acciones de Submissions
    const SubmissionActions = {
        delete: function(e) {
            const submissionId = $(e.target).closest('.sfq-delete-submission').data('submission-id');
            
            if (!confirm('¿Estás seguro de que quieres eliminar esta respuesta? Esta acción no se puede deshacer.')) {
                return;
            }

            AjaxManager.request('sfq_delete_submission', { submission_id: submissionId })
                .done((response) => {
                    if (response.success) {
                        SubmissionsApp.loadSubmissions();
                        SubmissionsApp.loadDashboardStats();
                    }
                });
        },

        applyBulk: function() {
            const action = $('#sfq-bulk-action').val();
            const selectedIds = $('.sfq-submission-checkbox:checked').map(function() {
                return $(this).val();
            }).get();

            if (!action || selectedIds.length === 0) {
                NotificationManager.show('Selecciona una acción y al menos un elemento', 'warning');
                return;
            }

            switch (action) {
                case 'delete':
                    this.deleteBulk(selectedIds);
                    break;
                case 'export':
                    ExportManager.showModal(selectedIds);
                    break;
            }
        },

        deleteBulk: function(ids) {
            if (!confirm(`¿Estás seguro de que quieres eliminar ${ids.length} respuestas? Esta acción no se puede deshacer.`)) {
                return;
            }

            AjaxManager.request('sfq_delete_submissions_bulk', { submission_ids: ids })
                .done((response) => {
                    if (response.success) {
                        SubmissionsApp.loadSubmissions();
                        SubmissionsApp.loadDashboardStats();
                    }
                });
        },

        saveNote: function() {
            const submissionId = $('#sfq-submission-modal-v2').data('current-id');
            const note = $('#sfq-submission-notes').val();

            AjaxManager.request('sfq_save_submission_note', { 
                submission_id: submissionId, 
                note: note 
            }, { showSuccess: false })
                .done((response) => {
                    if (response.success) {
                        NotificationManager.show('Nota guardada correctamente', 'success');
                    }
                });
        }
    };

    // Gestor de Exportación
    const ExportManager = {
        showModal: function(selectedIds = null) {
            if (selectedIds) {
                $('#sfq-export-modal').data('selected-ids', selectedIds);
            }
            $('#sfq-export-modal').show();
        },

        start: function() {
            const format = $('input[name="export_format"]:checked').val();
            const fields = $('input[name="export_fields[]"]:checked').map(function() {
                return $(this).val();
            }).get();
            const options = $('input[name="export_options[]"]:checked').map(function() {
                return $(this).val();
            }).get();

            if (fields.length === 0) {
                NotificationManager.show('Selecciona al menos un campo para exportar', 'warning');
                return;
            }

            this.showProgress();

            const requestData = {
                format: format,
                fields: fields,
                options: options,
                ...AppState.currentFilters
            };

            AjaxManager.request('sfq_export_submissions_advanced', requestData, { showLoading: false })
                .done((response) => {
                    if (response.success) {
                        this.downloadFile(response.data.file_url);
                        setTimeout(() => ModalManager.close(), 2000);
                    }
                })
                .always(() => {
                    $('#sfq-start-export').prop('disabled', false);
                    setTimeout(() => this.hideProgress(), 3000);
                });
        },

        showProgress: function() {
            $('#sfq-export-progress').show();
            $('#sfq-start-export').prop('disabled', true);

            let progress = 0;
            this.progressInterval = setInterval(() => {
                progress += Math.random() * 20;
                if (progress > 90) progress = 90;
                
                $('.sfq-progress-fill').css('width', progress + '%');
                $('.sfq-progress-text').text(Math.round(progress) + '%');
            }, 200);
        },

        hideProgress: function() {
            if (this.progressInterval) {
                clearInterval(this.progressInterval);
            }
            $('.sfq-progress-fill').css('width', '100%');
            $('.sfq-progress-text').text('100%');
            
            setTimeout(() => {
                $('#sfq-export-progress').hide();
                $('.sfq-progress-fill').css('width', '0%');
                $('.sfq-progress-text').text('0%');
            }, 1000);
        },

        downloadFile: function(url) {
            const link = document.createElement('a');
            link.href = url;
            link.download = '';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    // Gestor de Columnas
    const ColumnManager = {
        showModal: function() {
            const columns = [
                { key: 'id', label: 'ID', visible: true },
                { key: 'form_title', label: 'Formulario', visible: true },
                { key: 'user_name', label: 'Usuario', visible: true },
                { key: 'completed_at', label: 'Fecha', visible: true },
                { key: 'time_spent', label: 'Tiempo', visible: true },
                { key: 'responses', label: 'Respuestas', visible: true },
                { key: 'score', label: 'Puntuación', visible: true }
            ];

            let columnsHtml = '';
            columns.forEach(function(column) {
                columnsHtml += `
                    <div class="sfq-column-item">
                        <input type="checkbox" id="col-${column.key}" ${column.visible ? 'checked' : ''}>
                        <label for="col-${column.key}" class="sfq-column-name">${column.label}</label>
                        <span class="sfq-drag-handle dashicons dashicons-menu"></span>
                    </div>
                `;
            });

            $('#sfq-columns-list').html(columnsHtml);
            $('#sfq-columns-modal').show();
        },

        save: function() {
            const config = {};
            $('.sfq-column-item').each(function(index) {
                const checkbox = $(this).find('input[type="checkbox"]');
                const key = checkbox.attr('id').replace('col-', '');
                config[key] = {
                    visible: checkbox.is(':checked'),
                    order: index
                };
            });

            localStorage.setItem('sfq_columns_config', JSON.stringify(config));
            NotificationManager.show('Configuración de columnas guardada', 'success');
            ModalManager.close();
            SubmissionsApp.loadSubmissions();
        },

        reset: function() {
            localStorage.removeItem('sfq_columns_config');
            NotificationManager.show('Configuración de columnas restablecida', 'success');
            ModalManager.close();
            SubmissionsApp.loadSubmissions();
        }
    };

    // Aplicación principal
    const SubmissionsApp = {
        init: function() {
            this.loadExternalLibraries();
            this.initEventHandlers();
            this.initDatePickers();
            this.initCharts();
            this.loadInitialData();
        },

        loadInitialData: function() {
            this.loadDashboardStats();
            this.loadSubmissions();
            this.loadAnalyticsData();
        },

        loadExternalLibraries: function() {
            // Cargar Chart.js si no está disponible
            if (typeof Chart === 'undefined') {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
                script.onload = () => {
                    console.log('Chart.js loaded successfully');
                    this.initCharts();
                };
                script.onerror = () => {
                    console.error('Failed to load Chart.js');
                    NotificationManager.show('Error al cargar gráficos. Algunas funciones pueden no estar disponibles.', 'warning');
                };
                document.head.appendChild(script);
            }

            // Cargar Flatpickr para date pickers
            if (typeof flatpickr === 'undefined') {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css';
                link.onerror = () => console.error('Failed to load Flatpickr CSS');
                document.head.appendChild(link);

                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/flatpickr';
                script.onload = () => {
                    console.log('Flatpickr loaded successfully');
                    this.initDatePickers();
                };
                script.onerror = () => {
                    console.error('Failed to load Flatpickr');
                    NotificationManager.show('Error al cargar selector de fechas. Use formato YYYY-MM-DD.', 'warning');
                };
                document.head.appendChild(script);
            }
        },

        initEventHandlers: function() {
            // Header actions
            $('#sfq-refresh-data').on('click', () => this.refreshAllData());
            $('#sfq-export-advanced').on('click', () => ExportManager.showModal());

            // Filtros
            $('#sfq-apply-filters').on('click', () => FilterManager.apply());
            $('#sfq-clear-filters').on('click', () => FilterManager.clear());
            $('#sfq-save-filter').on('click', () => FilterManager.save());

            // Tabla
            $('#sfq-select-all').on('change', () => TableManager.toggleSelectAll());
            $(document).on('change', '.sfq-submission-checkbox', () => TableManager.updateBulkActions());
            $(document).on('click', '.sfq-sortable', (e) => TableManager.handleSort(e));
            $(document).on('click', '.sfq-view-submission', (e) => ModalManager.showSubmissionDetail(e));
            $(document).on('click', '.sfq-delete-submission', (e) => SubmissionActions.delete(e));

            // Paginación
            $(document).on('click', '.sfq-page-btn', (e) => PaginationManager.changePage(e));
            $('#sfq-per-page').on('change', (e) => PaginationManager.changePerPage(e));

            // Bulk actions
            $('#sfq-apply-bulk').on('click', () => SubmissionActions.applyBulk());

            // Modales
            $('.sfq-modal-close, .sfq-modal-backdrop').on('click', () => ModalManager.close());
            $('#sfq-prev-submission').on('click', () => ModalManager.showPrev());
            $('#sfq-next-submission').on('click', () => ModalManager.showNext());

            // Exportación
            $('#sfq-start-export').on('click', () => ExportManager.start());

            // Notas
            $('#sfq-save-note').on('click', () => SubmissionActions.saveNote());

            // Charts
            $('#sfq-chart-period').on('change', () => this.loadAnalyticsData());

            // Configuración de columnas
            $('#sfq-table-columns').on('click', () => ColumnManager.showModal());
            $('#sfq-save-columns').on('click', () => ColumnManager.save());
            $('#sfq-reset-columns').on('click', () => ColumnManager.reset());

            // Keyboard shortcuts
            $(document).on('keydown', (e) => this.handleKeyboardShortcuts(e));
        },

        initDatePickers: function() {
            if (typeof flatpickr !== 'undefined') {
                flatpickr('.sfq-datepicker', {
                    dateFormat: 'Y-m-d',
                    allowInput: true,
                    locale: { firstDayOfWeek: 1 }
                });
            }
        },

        initCharts: function() {
            if (typeof Chart === 'undefined') return;

            Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            Chart.defaults.color = '#6c757d';

            ChartManager.initSubmissionsChart();
            ChartManager.initFormsChart();
            ChartManager.initCountriesChart();
        },

        refreshAllData: function() {
            this.loadDashboardStats();
            this.loadSubmissions();
            this.loadAnalyticsData();
            NotificationManager.show('Datos actualizados', 'success');
        },

        handleKeyboardShortcuts: function(e) {
            if (e.keyCode === 27) ModalManager.close(); // ESC
            if ((e.ctrlKey || e.metaKey) && e.keyCode === 82) { // Ctrl/Cmd + R
                e.preventDefault();
                this.refreshAllData();
            }
            if ((e.ctrlKey || e.metaKey) && e.keyCode === 69) { // Ctrl/Cmd + E
                e.preventDefault();
                ExportManager.showModal();
            }
        },

        loadDashboardStats: function() {
            AjaxManager.request('sfq_get_dashboard_stats', {}, { showLoading: false })
                .done((response) => {
                    if (response.success) {
                        DashboardManager.updateStats(response.data);
                    }
                });
        },

        loadSubmissions: function() {
            TableManager.showLoading();

            const requestData = {
                page: AppState.currentPage,
                per_page: AppState.currentPerPage,
                sort_column: AppState.currentSort.column,
                sort_direction: AppState.currentSort.direction,
                ...AppState.currentFilters
            };

            AjaxManager.request('sfq_get_submissions_advanced', requestData, { showLoading: false })
                .done((response) => {
                    if (response.success) {
                        AppState.submissionsData = response.data.submissions;
                        TableManager.render(response.data);
                        PaginationManager.render(response.data);
                        TableManager.updateResultsCount(response.data.total);
                    }
                })
                .always(() => TableManager.hideLoading());
        },

        loadAnalyticsData: function() {
            const period = $('#sfq-chart-period').val() || 30;
            
            AjaxManager.request('sfq_get_form_analytics', { period }, { showLoading: false })
                .done((response) => {
                    if (response.success) {
                        ChartManager.updateCharts(response.data);
                    }
                });
        }
    };

    // Inicialización
    $(document).ready(function() {
        if ($('.sfq-submissions-wrap-v2').length) {
            SubmissionsApp.init();
        }
    });

    // Exponer funciones globales si es necesario
    window.SFQSubmissions = {
        refresh: () => SubmissionsApp.refreshAllData(),
        export: () => ExportManager.showModal(),
        loadSubmissions: () => SubmissionsApp.loadSubmissions()
    };

})(jQuery);

// Estilos adicionales para notificaciones
jQuery(document).ready(function($) {
    if (!$('#sfq-notification-styles').length) {
        $('head').append(`
            <style id="sfq-notification-styles">
                .sfq-notification {
                    position: fixed;
                    top: 32px;
                    right: 20px;
                    padding: 12px 20px;
                    border-radius: 6px;
                    color: white;
                    font-weight: 500;
                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
                    min-width: 250px;
                    max-width: 400px;
                    z-index: 99999;
                    transform: translateX(100%);
                    opacity: 0;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                
                .sfq-notification.show {
                    transform: translateX(0);
                    opacity: 1;
                }
                
                .sfq-notification-success {
                    background: linear-gradient(135deg, #46b450 0%, #3a9444 100%);
                }
                
                .sfq-notification-error {
                    background: linear-gradient(135deg, #dc3232 0%, #c62828 100%);
                }
                
                .sfq-notification-warning {
                    background: linear-gradient(135deg, #ffb900 0%, #ff9800 100%);
                }
                
                .sfq-notification-info {
                    background: linear-gradient(135deg, #00a0d2 0%, #0073aa 100%);
                }

                .sfq-badge {
                    display: inline-block;
                    padding: 2px 8px;
                    font-size: 11px;
                    font-weight: 600;
                    border-radius: 3px;
                    text-transform: uppercase;
                    margin-left: 5px;
                }

                .sfq-badge-success {
                    background: rgba(70, 180, 80, 0.1);
                    color: #46b450;
                }

                .sfq-badge-secondary {
                    background: rgba(108, 117, 125, 0.1);
                    color: #6c757d;
                }

                .sfq-time-badge {
                    display: inline-block;
                    padding: 4px 8px;
                    background: rgba(0, 124, 186, 0.1);
                    color: #007cba;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: 500;
                }

                .sfq-score-badge {
                    display: inline-block;
                    padding: 4px 8px;
                    background: linear-gradient(135deg, #ffb900, #ff9800);
                    color: white;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: 600;
                }

                .sfq-responses-count {
                    font-weight: 600;
                    color: #007cba;
                }

                .sfq-row-actions {
                    display: flex;
                    gap: 5px;
                }

                .sfq-row-actions .button {
                    min-width: 32px;
                    height: 32px;
                    padding: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .sfq-row-actions .button .dashicons {
                    font-size: 16px;
                    width: 16px;
                    height: 16px;
                }

                .sfq-pagination-dots {
                    padding: 0 8px;
                    color: #6c757d;
                }
            </style>
        `);
    }
});
