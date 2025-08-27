/**
 * Smart Forms & Quiz - Admin Submissions JavaScript V2
 * Funcionalidad avanzada para la página de respuestas mejorada
 */

(function($) {
    'use strict';

    // Variables globales
    let currentPage = 1;
    let currentPerPage = 25;
    let currentSort = { column: 'completed_at', direction: 'DESC' };
    let currentFilters = {};
    let submissionsData = [];
    let chartsInstances = {};

    // Inicialización
    $(document).ready(function() {
        if ($('.sfq-submissions-wrap-v2').length) {
            initSubmissionsPage();
        }
    });

    /**
     * Inicializar página de submissions
     */
    function initSubmissionsPage() {
        // Cargar librerías necesarias
        loadExternalLibraries();
        
        // Inicializar componentes
        initEventHandlers();
        initDatePickers();
        initCharts();
        
        // Cargar datos iniciales
        loadDashboardStats();
        loadSubmissions();
        loadAnalyticsData();
    }

    /**
     * Cargar librerías externas
     */
    function loadExternalLibraries() {
        // Cargar Chart.js si no está disponible
        if (typeof Chart === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = function() {
                initCharts();
            };
            document.head.appendChild(script);
        }

        // Cargar Flatpickr para date pickers
        if (typeof flatpickr === 'undefined') {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css';
            document.head.appendChild(link);

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/flatpickr';
            script.onload = function() {
                initDatePickers();
            };
            document.head.appendChild(script);
        }
    }

    /**
     * Inicializar event handlers
     */
    function initEventHandlers() {
        // Header actions
        $('#sfq-refresh-data').on('click', refreshAllData);
        $('#sfq-export-advanced').on('click', showExportModal);

        // Filtros
        $('#sfq-apply-filters').on('click', applyFilters);
        $('#sfq-clear-filters').on('click', clearFilters);
        $('#sfq-save-filter').on('click', saveCurrentFilter);

        // Tabla
        $('#sfq-select-all').on('change', toggleSelectAll);
        $(document).on('change', '.sfq-submission-checkbox', updateBulkActions);
        $(document).on('click', '.sfq-sortable', handleSort);
        $(document).on('click', '.sfq-view-submission', showSubmissionDetail);
        $(document).on('click', '.sfq-delete-submission', deleteSubmission);

        // Paginación
        $(document).on('click', '.sfq-page-btn', changePage);
        $('#sfq-per-page').on('change', changePerPage);

        // Bulk actions
        $('#sfq-apply-bulk').on('click', applyBulkAction);

        // Modales
        $('.sfq-modal-close, .sfq-modal-backdrop').on('click', closeModal);
        $('#sfq-prev-submission').on('click', showPrevSubmission);
        $('#sfq-next-submission').on('click', showNextSubmission);

        // Exportación
        $('#sfq-start-export').on('click', startExport);

        // Notas
        $('#sfq-save-note').on('click', saveSubmissionNote);

        // Charts
        $('#sfq-chart-period').on('change', updateChartsData);

        // Configuración de columnas
        $('#sfq-table-columns').on('click', showColumnsModal);
        $('#sfq-save-columns').on('click', saveColumnsConfig);
        $('#sfq-reset-columns').on('click', resetColumnsConfig);

        // Keyboard shortcuts
        $(document).on('keydown', handleKeyboardShortcuts);
    }

    /**
     * Inicializar date pickers
     */
    function initDatePickers() {
        if (typeof flatpickr !== 'undefined') {
            flatpickr('.sfq-datepicker', {
                dateFormat: 'Y-m-d',
                allowInput: true,
                locale: {
                    firstDayOfWeek: 1
                }
            });
        }
    }

    /**
     * Inicializar gráficos
     */
    function initCharts() {
        if (typeof Chart === 'undefined') return;

        // Configuración común
        Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        Chart.defaults.color = '#6c757d';

        // Gráfico de submissions por día
        const submissionsCtx = document.getElementById('sfq-submissions-chart');
        if (submissionsCtx) {
            chartsInstances.submissions = new Chart(submissionsCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Respuestas',
                        data: [],
                        borderColor: '#007cba',
                        backgroundColor: 'rgba(0, 124, 186, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    }
                }
            });
        }

        // Gráfico de formularios populares
        const formsCtx = document.getElementById('sfq-forms-chart');
        if (formsCtx) {
            chartsInstances.forms = new Chart(formsCtx, {
                type: 'doughnut',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        backgroundColor: [
                            '#007cba',
                            '#46b450',
                            '#ffb900',
                            '#dc3232',
                            '#00a0d2',
                            '#6c757d'
                        ],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 20,
                                usePointStyle: true
                            }
                        }
                    }
                }
            });
        }

        // Gráfico de países
        const countriesCtx = document.getElementById('sfq-countries-chart');
        if (countriesCtx) {
            chartsInstances.countries = new Chart(countriesCtx, {
                type: 'doughnut',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        backgroundColor: [
                            '#007cba',
                            '#46b450',
                            '#ffb900',
                            '#dc3232',
                            '#00a0d2',
                            '#6c757d',
                            '#9b59b6',
                            '#e67e22',
                            '#1abc9c',
                            '#34495e'
                        ],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 20,
                                usePointStyle: true
                            }
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
        }
    }

    /**
     * Cargar estadísticas del dashboard
     */
    function loadDashboardStats() {
        $.ajax({
            url: ajaxurl,
            type: 'POST',
            data: {
                action: 'sfq_get_dashboard_stats',
                nonce: sfq_ajax.nonce
            },
            success: function(response) {
                if (response.success) {
                    updateDashboardStats(response.data);
                }
            },
            error: function() {
                showNotification('Error al cargar estadísticas', 'error');
            }
        });
    }

    /**
     * Actualizar estadísticas del dashboard
     */
    function updateDashboardStats(data) {
        // Total submissions
        $('#total-submissions .sfq-stat-number').text(data.total_submissions);
        
        // Today submissions
        $('#today-submissions .sfq-stat-number').text(data.today_submissions);
        const changeClass = data.today_change > 0 ? 'positive' : (data.today_change < 0 ? 'negative' : 'neutral');
        const changeSymbol = data.today_change > 0 ? '+' : '';
        $('#today-submissions .sfq-stat-change')
            .text(changeSymbol + data.today_change + '%')
            .removeClass('positive negative neutral')
            .addClass(changeClass);

        // Average completion time
        $('#avg-completion-time .sfq-stat-number').text(data.avg_completion_time);

        // Conversion rate
        $('#conversion-rate .sfq-stat-number').text(data.conversion_rate + '%');

        // Animación de números
        animateNumbers();
    }

    /**
     * Animar números del dashboard
     */
    function animateNumbers() {
        $('.sfq-stat-number').each(function() {
            const $this = $(this);
            const text = $this.text();
            const number = parseInt(text.replace(/[^\d]/g, ''));
            
            if (!isNaN(number) && number > 0) {
                $this.prop('Counter', 0).animate({
                    Counter: number
                }, {
                    duration: 1000,
                    easing: 'swing',
                    step: function(now) {
                        const formatted = Math.ceil(now).toLocaleString();
                        $this.text(text.replace(/[\d,]+/, formatted));
                    }
                });
            }
        });
    }

    /**
     * Cargar datos de analytics
     */
    function loadAnalyticsData() {
        const period = $('#sfq-chart-period').val() || 30;
        
        $.ajax({
            url: ajaxurl,
            type: 'POST',
            data: {
                action: 'sfq_get_form_analytics',
                nonce: sfq_ajax.nonce,
                period: period
            },
            success: function(response) {
                if (response.success) {
                    updateCharts(response.data);
                }
            },
            error: function() {
                showNotification('Error al cargar analytics', 'error');
            }
        });
    }

    /**
     * Actualizar gráficos
     */
    function updateCharts(data) {
        // Gráfico de submissions por día
        if (chartsInstances.submissions && data.daily_submissions) {
            const labels = data.daily_submissions.map(item => {
                const date = new Date(item.date);
                return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
            });
            const values = data.daily_submissions.map(item => parseInt(item.count));

            chartsInstances.submissions.data.labels = labels;
            chartsInstances.submissions.data.datasets[0].data = values;
            chartsInstances.submissions.update();
        }

        // Gráfico de formularios populares
        if (chartsInstances.forms && data.popular_forms) {
            const labels = data.popular_forms.map(item => item.title);
            const values = data.popular_forms.map(item => parseInt(item.submissions));

            chartsInstances.forms.data.labels = labels;
            chartsInstances.forms.data.datasets[0].data = values;
            chartsInstances.forms.update();
        }

        // Gráfico de países
        if (chartsInstances.countries && data.countries_data) {
            // Verificar si countries_data es un array o un objeto
            let countriesArray = [];
            
            if (Array.isArray(data.countries_data)) {
                countriesArray = data.countries_data;
            } else if (typeof data.countries_data === 'object' && data.countries_data !== null) {
                // Convertir objeto a array
                countriesArray = Object.values(data.countries_data);
            }
            
            if (countriesArray.length > 0) {
                const labels = countriesArray.map(item => `${item.flag_emoji} ${item.country_name}`);
                const values = countriesArray.map(item => parseInt(item.count));

                chartsInstances.countries.data.labels = labels;
                chartsInstances.countries.data.datasets[0].data = values;
                chartsInstances.countries.update();
            }
        }
    }

    /**
     * Actualizar datos de gráficos
     */
    function updateChartsData() {
        loadAnalyticsData();
    }

    /**
     * Refrescar todos los datos
     */
    function refreshAllData() {
        loadDashboardStats();
        loadSubmissions();
        loadAnalyticsData();
        showNotification('Datos actualizados', 'success');
    }

    /**
     * Cargar submissions
     */
    function loadSubmissions() {
        showTableLoading();

        const requestData = {
            action: 'sfq_get_submissions_advanced',
            nonce: sfq_ajax.nonce,
            page: currentPage,
            per_page: currentPerPage,
            sort_column: currentSort.column,
            sort_direction: currentSort.direction,
            ...currentFilters
        };

        $.ajax({
            url: ajaxurl,
            type: 'POST',
            data: requestData,
            success: function(response) {
                if (response.success) {
                    submissionsData = response.data.submissions;
                    renderSubmissionsTable(response.data);
                    renderPagination(response.data);
                    updateResultsCount(response.data.total);
                } else {
                    showNotification('Error al cargar submissions: ' + response.data.message, 'error');
                }
            },
            error: function() {
                showNotification('Error de conexión al cargar submissions', 'error');
            },
            complete: function() {
                hideTableLoading();
            }
        });
    }

    /**
     * Mostrar loading en tabla
     */
    function showTableLoading() {
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
        $('#sfq-submissions-tbody-advanced').html(loadingRow);
    }

    /**
     * Ocultar loading en tabla
     */
    function hideTableLoading() {
        $('.sfq-loading-row').remove();
    }

    /**
     * Renderizar tabla de submissions
     */
    function renderSubmissionsTable(data) {
        const tbody = $('#sfq-submissions-tbody-advanced');
        tbody.empty();

        if (!data.submissions || data.submissions.length === 0) {
            tbody.html(`
                <tr>
                    <td colspan="9" class="sfq-text-center" style="padding: 40px;">
                        <p>No se encontraron respuestas con los filtros aplicados.</p>
                    </td>
                </tr>
            `);
            return;
        }

        data.submissions.forEach(function(submission, index) {
            const row = createSubmissionRow(submission, index);
            tbody.append(row);
        });

        // Actualizar indicadores de ordenación
        updateSortIndicators();
    }

    /**
     * Crear fila de submission
     */
    function createSubmissionRow(submission, index) {
        const userBadge = submission.user_type === 'registered' 
            ? '<span class="sfq-badge sfq-badge-success">Registrado</span>'
            : '<span class="sfq-badge sfq-badge-secondary">Anónimo</span>';

        const scoreBadge = submission.total_score > 0 
            ? `<span class="sfq-score-badge">${submission.total_score}</span>`
            : '-';

        // Información del país
        const countryInfo = submission.country_info || { flag_emoji: '🌍', country_name: 'Desconocido' };
        const countryBadge = `<span class="sfq-country-badge" title="${escapeHtml(countryInfo.country_name)}">${countryInfo.flag_emoji}</span>`;

        return `
            <tr data-submission-id="${submission.id}" data-index="${index}">
                <td class="check-column">
                    <input type="checkbox" class="sfq-submission-checkbox" value="${submission.id}">
                </td>
                <td><strong>#${submission.id}</strong></td>
                <td>
                    <strong>${escapeHtml(submission.form_title || 'Sin título')}</strong>
                </td>
                <td>
                    <div class="sfq-user-info">
                        <strong>${escapeHtml(submission.user_name)}</strong>
                        ${userBadge}
                        ${countryBadge}
                    </div>
                </td>
                <td>
                    <div class="sfq-date-info">
                        <strong>${submission.formatted_date}</strong>
                    </div>
                </td>
                <td>
                    <span class="sfq-time-badge">${submission.time_spent_formatted}</span>
                </td>
                <td>
                    <span class="sfq-responses-count">${submission.response_count}</span>
                </td>
                <td>${scoreBadge}</td>
                <td>
                    <div class="sfq-row-actions">
                        <button class="button button-small sfq-view-submission" 
                                data-submission-id="${submission.id}" 
                                data-index="${index}"
                                title="Ver detalles">
                            <span class="dashicons dashicons-visibility"></span>
                        </button>
                        <button class="button button-small sfq-delete-submission" 
                                data-submission-id="${submission.id}"
                                title="Eliminar">
                            <span class="dashicons dashicons-trash"></span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    /**
     * Renderizar paginación
     */
    function renderPagination(data) {
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
    }

    /**
     * Actualizar contador de resultados
     */
    function updateResultsCount(total) {
        $('#sfq-results-count').text(total.toLocaleString());
    }

    /**
     * Aplicar filtros
     */
    function applyFilters() {
        currentFilters = {
            form_id: $('#sfq-filter-form').val(),
            date_from: $('#sfq-filter-date-from').val(),
            date_to: $('#sfq-filter-date-to').val(),
            user_type: $('#sfq-filter-user').val(),
            status: $('#sfq-filter-status').val(),
            time_min: $('#sfq-filter-time-min').val(),
            time_max: $('#sfq-filter-time-max').val(),
            search: $('#sfq-filter-search').val()
        };

        // Limpiar filtros vacíos
        Object.keys(currentFilters).forEach(key => {
            if (!currentFilters[key]) {
                delete currentFilters[key];
            }
        });

        currentPage = 1;
        loadSubmissions();
    }

    /**
     * Limpiar filtros
     */
    function clearFilters() {
        $('#sfq-filter-form').val('');
        $('#sfq-filter-date-from').val('');
        $('#sfq-filter-date-to').val('');
        $('#sfq-filter-user').val('');
        $('#sfq-filter-status').val('');
        $('#sfq-filter-time-min').val('');
        $('#sfq-filter-time-max').val('');
        $('#sfq-filter-search').val('');
        
        currentFilters = {};
        currentPage = 1;
        loadSubmissions();
    }

    /**
     * Manejar ordenación
     */
    function handleSort() {
        const column = $(this).data('column');
        
        if (currentSort.column === column) {
            currentSort.direction = currentSort.direction === 'ASC' ? 'DESC' : 'ASC';
        } else {
            currentSort.column = column;
            currentSort.direction = 'DESC';
        }

        currentPage = 1;
        loadSubmissions();
    }

    /**
     * Actualizar indicadores de ordenación
     */
    function updateSortIndicators() {
        $('.sfq-sortable').removeClass('sorted asc desc');
        $(`.sfq-sortable[data-column="${currentSort.column}"]`)
            .addClass('sorted')
            .addClass(currentSort.direction.toLowerCase());
    }

    /**
     * Cambiar página
     */
    function changePage() {
        const page = parseInt($(this).data('page'));
        if (page && page !== currentPage) {
            currentPage = page;
            loadSubmissions();
        }
    }

    /**
     * Cambiar elementos por página
     */
    function changePerPage() {
        currentPerPage = parseInt($(this).val());
        currentPage = 1;
        loadSubmissions();
    }

    /**
     * Toggle select all
     */
    function toggleSelectAll() {
        const isChecked = $(this).is(':checked');
        $('.sfq-submission-checkbox').prop('checked', isChecked);
        updateBulkActions();
    }

    /**
     * Actualizar acciones en lote
     */
    function updateBulkActions() {
        const checkedCount = $('.sfq-submission-checkbox:checked').length;
        
        if (checkedCount > 0) {
            $('.sfq-bulk-actions').show();
        } else {
            $('.sfq-bulk-actions').hide();
        }
    }

    /**
     * Aplicar acción en lote
     */
    function applyBulkAction() {
        const action = $('#sfq-bulk-action').val();
        const selectedIds = $('.sfq-submission-checkbox:checked').map(function() {
            return $(this).val();
        }).get();

        if (!action || selectedIds.length === 0) {
            showNotification('Selecciona una acción y al menos un elemento', 'warning');
            return;
        }

        switch (action) {
            case 'delete':
                deleteBulkSubmissions(selectedIds);
                break;
            case 'export':
                exportSelectedSubmissions(selectedIds);
                break;
        }
    }

    /**
     * Eliminar submissions en lote
     */
    function deleteBulkSubmissions(ids) {
        if (!confirm(`¿Estás seguro de que quieres eliminar ${ids.length} respuestas? Esta acción no se puede deshacer.`)) {
            return;
        }

        $.ajax({
            url: ajaxurl,
            type: 'POST',
            data: {
                action: 'sfq_delete_submissions_bulk',
                nonce: sfq_ajax.nonce,
                submission_ids: ids
            },
            success: function(response) {
                if (response.success) {
                    showNotification(response.data.message, 'success');
                    loadSubmissions();
                    loadDashboardStats();
                } else {
                    showNotification('Error: ' + response.data.message, 'error');
                }
            },
            error: function() {
                showNotification('Error de conexión', 'error');
            }
        });
    }

    /**
     * Eliminar submission individual
     */
    function deleteSubmission() {
        const submissionId = $(this).data('submission-id');
        
        if (!confirm('¿Estás seguro de que quieres eliminar esta respuesta? Esta acción no se puede deshacer.')) {
            return;
        }

        $.ajax({
            url: ajaxurl,
            type: 'POST',
            data: {
                action: 'sfq_delete_submission',
                nonce: sfq_ajax.nonce,
                submission_id: submissionId
            },
            success: function(response) {
                if (response.success) {
                    showNotification('Respuesta eliminada correctamente', 'success');
                    loadSubmissions();
                    loadDashboardStats();
                } else {
                    showNotification('Error: ' + response.data.message, 'error');
                }
            },
            error: function() {
                showNotification('Error de conexión', 'error');
            }
        });
    }

    /**
     * Mostrar detalle de submission
     */
    function showSubmissionDetail() {
        const submissionId = $(this).data('submission-id');
        const index = $(this).data('index');
        
        loadSubmissionDetail(submissionId, index);
    }

    /**
     * Cargar detalle de submission
     */
    function loadSubmissionDetail(submissionId, index) {
        $.ajax({
            url: ajaxurl,
            type: 'POST',
            data: {
                action: 'sfq_get_submission_detail',
                nonce: sfq_ajax.nonce,
                submission_id: submissionId
            },
            success: function(response) {
                if (response.success) {
                    renderSubmissionDetail(response.data, index);
                    $('#sfq-submission-modal-v2').show();
                } else {
                    showNotification('Error al cargar detalle: ' + response.data.message, 'error');
                }
            },
            error: function() {
                showNotification('Error de conexión', 'error');
            }
        });
    }

    /**
     * Renderizar detalle de submission
     */
    function renderSubmissionDetail(data, index) {
        const submission = data.submission;
        const responses = data.responses;

        // Actualizar título y subtítulo
        $('#sfq-modal-subtitle').text(`#${submission.id} - ${submission.form_title}`);

        // Información del submission - Mejorar manejo de country_info
        let countryInfo = { flag_emoji: '🌍', country_name: 'Desconocido' };
        
        // Verificar si country_info existe y tiene la estructura correcta
        if (submission.country_info) {
            if (typeof submission.country_info === 'object') {
                countryInfo = {
                    flag_emoji: submission.country_info.flag_emoji || '🌍',
                    country_name: submission.country_info.country_name || 'Desconocido'
                };
            } else if (typeof submission.country_info === 'string') {
                // Si es string, intentar parsearlo como JSON
                try {
                    const parsed = JSON.parse(submission.country_info);
                    countryInfo = {
                        flag_emoji: parsed.flag_emoji || '🌍',
                        country_name: parsed.country_name || 'Desconocido'
                    };
                } catch (e) {
                    // Silenciar error de parsing en producción
                }
            }
        }
        
        // Crear elementos de forma segura para evitar XSS
        const $infoContainer = $('#sfq-submission-info-v2');
        $infoContainer.empty();
        
        // Crear elementos de forma segura
        $infoContainer.append($('<h4>').text('Información General'));
        $infoContainer.append($('<p>').html($('<strong>').text('Formulario: ')).append(document.createTextNode(submission.form_title || 'Sin título')));
        $infoContainer.append($('<p>').html($('<strong>').text('Usuario: ')).append(document.createTextNode(submission.user_name || 'Anónimo')));
        
        // País con emoji (emoji es seguro, pero sanitizar nombre)
        const $countryP = $('<p>').html($('<strong>').text('País: '));
        $countryP.append(document.createTextNode(countryInfo.flag_emoji + ' '));
        $countryP.append(document.createTextNode(countryInfo.country_name || 'Desconocido'));
        $infoContainer.append($countryP);
        
        $infoContainer.append($('<p>').html($('<strong>').text('Fecha: ')).append(document.createTextNode(submission.formatted_date || '-')));
        $infoContainer.append($('<p>').html($('<strong>').text('Tiempo: ')).append(document.createTextNode(submission.time_spent_formatted || '-')));
        $infoContainer.append($('<p>').html($('<strong>').text('IP: ')).append(document.createTextNode(submission.user_ip || '-')));
        
        if (submission.total_score > 0) {
            $infoContainer.append($('<p>').html($('<strong>').text('Puntuación: ')).append(document.createTextNode(submission.total_score)));
        }

        // Cargar nota existente
        const existingNote = submission.admin_note || '';
        $('#sfq-submission-notes').val(existingNote);

        // Respuestas
        let responsesHtml = '';
        if (responses && responses.length > 0) {
            responses.forEach(function(response) {
                responsesHtml += `
                    <div class="sfq-response-item">
                        <div class="sfq-response-question">${escapeHtml(response.question_text)}</div>
                        <div class="sfq-response-answer">${escapeHtml(response.answer_formatted)}</div>
                    </div>
                `;
            });
        } else {
            responsesHtml = '<p class="sfq-text-muted">No hay respuestas disponibles.</p>';
        }
        $('#sfq-responses-container-v2').html(responsesHtml);

        // Configurar navegación
        setupModalNavigation(submission.id, index);
    }

    /**
     * Configurar navegación del modal
     */
    function setupModalNavigation(currentId, currentIndex) {
        // Botón anterior
        if (currentIndex > 0) {
            $('#sfq-prev-submission').prop('disabled', false).data('index', currentIndex - 1);
        } else {
            $('#sfq-prev-submission').prop('disabled', true);
        }

        // Botón siguiente
        if (currentIndex < submissionsData.length - 1) {
            $('#sfq-next-submission').prop('disabled', false).data('index', currentIndex + 1);
        } else {
            $('#sfq-next-submission').prop('disabled', true);
        }

        // Guardar ID actual para otras acciones
        $('#sfq-submission-modal-v2').data('current-id', currentId).data('current-index', currentIndex);
    }

    /**
     * Mostrar submission anterior
     */
    function showPrevSubmission() {
        const index = $(this).data('index');
        if (index >= 0 && submissionsData[index]) {
            loadSubmissionDetail(submissionsData[index].id, index);
        }
    }

    /**
     * Mostrar submission siguiente
     */
    function showNextSubmission() {
        const index = $(this).data('index');
        if (index < submissionsData.length && submissionsData[index]) {
            loadSubmissionDetail(submissionsData[index].id, index);
        }
    }

    /**
     * Guardar nota de submission
     */
    function saveSubmissionNote() {
        const submissionId = $('#sfq-submission-modal-v2').data('current-id');
        const note = $('#sfq-submission-notes').val();

        $.ajax({
            url: ajaxurl,
            type: 'POST',
            data: {
                action: 'sfq_save_submission_note',
                nonce: sfq_ajax.nonce,
                submission_id: submissionId,
                note: note
            },
            success: function(response) {
                if (response.success) {
                    showNotification('Nota guardada correctamente', 'success');
                } else {
                    showNotification('Error al guardar nota: ' + response.data.message, 'error');
                }
            },
            error: function() {
                showNotification('Error de conexión', 'error');
            }
        });
    }

    /**
     * Mostrar modal de exportación
     */
    function showExportModal() {
        $('#sfq-export-modal').show();
    }

    /**
     * Iniciar exportación
     */
    function startExport() {
        const format = $('input[name="export_format"]:checked').val();
        const fields = $('input[name="export_fields[]"]:checked').map(function() {
            return $(this).val();
        }).get();
        const options = $('input[name="export_options[]"]:checked').map(function() {
            return $(this).val();
        }).get();

        if (fields.length === 0) {
            showNotification('Selecciona al menos un campo para exportar', 'warning');
            return;
        }

        // Mostrar progreso
        $('#sfq-export-progress').show();
        $('#sfq-start-export').prop('disabled', true);

        // Simular progreso
        let progress = 0;
        const progressInterval = setInterval(function() {
            progress += Math.random() * 20;
            if (progress > 90) progress = 90;
            
            $('.sfq-progress-fill').css('width', progress + '%');
            $('.sfq-progress-text').text(Math.round(progress) + '%');
        }, 200);

        $.ajax({
            url: ajaxurl,
            type: 'POST',
            data: {
                action: 'sfq_export_submissions_advanced',
                nonce: sfq_ajax.nonce,
                format: format,
                fields: fields,
                options: options,
                ...currentFilters
            },
            success: function(response) {
                clearInterval(progressInterval);
                $('.sfq-progress-fill').css('width', '100%');
                $('.sfq-progress-text').text('100%');

                if (response.success) {
                    showNotification('Exportación completada', 'success');
                    
                    // Descargar archivo
                    const link = document.createElement('a');
                    link.href = response.data.file_url;
                    link.download = '';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    // Cerrar modal después de un momento
                    setTimeout(function() {
                        closeModal();
                    }, 2000);
                } else {
                    showNotification('Error en exportación: ' + response.data.message, 'error');
                }
            },
            error: function() {
                clearInterval(progressInterval);
                showNotification('Error de conexión en exportación', 'error');
            },
            complete: function() {
                $('#sfq-start-export').prop('disabled', false);
                setTimeout(function() {
                    $('#sfq-export-progress').hide();
                    $('.sfq-progress-fill').css('width', '0%');
                    $('.sfq-progress-text').text('0%');
                }, 3000);
            }
        });
    }

    /**
     * Exportar submissions seleccionados
     */
    function exportSelectedSubmissions(ids) {
        // Abrir modal de exportación con IDs preseleccionados
        $('#sfq-export-modal').data('selected-ids', ids).show();
    }

    /**
     * Cerrar modal
     */
    function closeModal() {
        $('.sfq-modal-v2').hide();
    }

    /**
     * Guardar filtro actual
     */
    function saveCurrentFilter() {
        const filterName = prompt('Nombre para este filtro:');
        if (!filterName) return;

        const savedFilters = JSON.parse(localStorage.getItem('sfq_saved_filters') || '{}');
        savedFilters[filterName] = currentFilters;
        localStorage.setItem('sfq_saved_filters', JSON.stringify(savedFilters));
        
        showNotification('Filtro guardado: ' + filterName, 'success');
    }

    /**
     * Mostrar modal de configuración de columnas
     */
    function showColumnsModal() {
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
    }

    /**
     * Guardar configuración de columnas
     */
    function saveColumnsConfig() {
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
        showNotification('Configuración de columnas guardada', 'success');
        closeModal();
        
        // Aplicar configuración (recargar tabla)
        loadSubmissions();
    }

    /**
     * Restablecer configuración de columnas
     */
    function resetColumnsConfig() {
        localStorage.removeItem('sfq_columns_config');
        showNotification('Configuración de columnas restablecida', 'success');
        closeModal();
        loadSubmissions();
    }

    /**
     * Manejar atajos de teclado
     */
    function handleKeyboardShortcuts(e) {
        // ESC para cerrar modales
        if (e.keyCode === 27) {
            closeModal();
        }

        // Ctrl/Cmd + R para refrescar
        if ((e.ctrlKey || e.metaKey) && e.keyCode === 82) {
            e.preventDefault();
            refreshAllData();
        }

        // Ctrl/Cmd + E para exportar
        if ((e.ctrlKey || e.metaKey) && e.keyCode === 69) {
            e.preventDefault();
            showExportModal();
        }
    }

    /**
     * Mostrar notificación
     */
    function showNotification(message, type = 'info') {
        const notification = $(`
            <div class="sfq-notification sfq-notification-${type}">
                ${message}
            </div>
        `);

        $('body').append(notification);

        // Mostrar con animación
        setTimeout(function() {
            notification.addClass('show');
        }, 100);

        // Ocultar después de 4 segundos
        setTimeout(function() {
            notification.removeClass('show');
            setTimeout(function() {
                notification.remove();
            }, 300);
        }, 4000);
    }

    /**
     * Escapar HTML
     */
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text ? text.replace(/[&<>"']/g, function(m) { return map[m]; }) : '';
    }

    // Exponer funciones globales si es necesario
    window.SFQSubmissions = {
        refresh: refreshAllData,
        export: showExportModal,
        loadSubmissions: loadSubmissions
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
