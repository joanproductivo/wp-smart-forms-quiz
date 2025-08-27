/**
 * Smart Forms & Quiz - Admin Submissions JavaScript V2
 * Funcionalidad avanzada para la página de respuestas mejorada
 */

(function($) {
    'use strict';

    // Configuración y constantes
    const CONFIG = {
        DEFAULT_PER_PAGE: 25,
        DEFAULT_SORT: { column: 'completed_at', direction: 'DESC' },
        ANIMATION_DURATION: 1000,
        CACHE_DURATION: 5 * 60 * 1000, // 5 minutos
        CHART_COLORS: [
            '#007cba', '#46b450', '#ffb900', '#dc3232', 
            '#00a0d2', '#6c757d', '#9b59b6', '#e67e22', 
            '#1abc9c', '#34495e'
        ]
    };

    // Estado de la aplicación
    const AppState = {
        currentPage: 1,
        currentPerPage: CONFIG.DEFAULT_PER_PAGE,
        currentSort: { ...CONFIG.DEFAULT_SORT },
        currentFilters: {},
        submissionsData: [],
        chartsInstances: {},
        isLoading: false,
        cache: new Map()
    };

    // Utilidades AJAX centralizadas
    const AjaxUtil = {
        request: function(action, data = {}, options = {}) {
            const defaultOptions = {
                showLoading: true,
                showSuccess: true,
                showError: true
            };
            
            const opts = { ...defaultOptions, ...options };
            
            if (opts.showLoading) {
                this.showLoading();
            }

            return $.ajax({
                url: ajaxurl,
                type: 'POST',
                data: {
                    action: action,
                    nonce: sfq_ajax.nonce,
                    ...data
                }
            }).done(function(response) {
                if (response.success) {
                    if (opts.showSuccess && response.data.message) {
                        NotificationUtil.show(response.data.message, 'success');
                    }
                } else {
                    if (opts.showError) {
                        NotificationUtil.show('Error: ' + (response.data?.message || 'Error desconocido'), 'error');
                    }
                }
            }).fail(function() {
                if (opts.showError) {
                    NotificationUtil.show('Error de conexión', 'error');
                }
            }).always(function() {
                if (opts.showLoading) {
                    AjaxUtil.hideLoading();
                }
            });
        },

        showLoading: function() {
            AppState.isLoading = true;
            $('.sfq-loading-overlay').show();
        },

        hideLoading: function() {
            AppState.isLoading = false;
            $('.sfq-loading-overlay').hide();
        }
    };

    // Utilidades de notificación
    const NotificationUtil = {
        show: function(message, type = 'info') {
            const notification = $(`
                <div class="sfq-notification sfq-notification-${type}">
                    ${this.escapeHtml(message)}
                </div>
            `);

            $('body').append(notification);

            setTimeout(() => notification.addClass('show'), 100);
            setTimeout(() => {
                notification.removeClass('show');
                setTimeout(() => notification.remove(), 300);
            }, 4000);
        },

        escapeHtml: function(text) {
            const map = {
                '&': '&amp;', '<': '&lt;', '>': '&gt;',
                '"': '&quot;', "'": '&#039;'
            };
            return text ? text.replace(/[&<>"']/g, m => map[m]) : '';
        }
    };

    // Gestor de Dashboard
    const DashboardManager = {
        updateStats: function(data) {
            $('#total-submissions .sfq-stat-number').text(data.total_submissions);
            
            $('#today-submissions .sfq-stat-number').text(data.today_submissions);
            const changeClass = data.today_change > 0 ? 'positive' : (data.today_change < 0 ? 'negative' : 'neutral');
            const changeSymbol = data.today_change > 0 ? '+' : '';
            $('#today-submissions .sfq-stat-change')
                .text(changeSymbol + data.today_change + '%')
                .removeClass('positive negative neutral')
                .addClass(changeClass);

            $('#avg-completion-time .sfq-stat-number').text(data.avg_completion_time);
            $('#conversion-rate .sfq-stat-number').text(data.conversion_rate + '%');

            this.animateNumbers();
        },

        animateNumbers: function() {
            $('.sfq-stat-number').each(function() {
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
        initSubmissionsChart: function() {
            const ctx = document.getElementById('sfq-submissions-chart');
            if (!ctx) return;

            AppState.chartsInstances.submissions = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Respuestas',
                        data: [],
                        borderColor: CONFIG.CHART_COLORS[0],
                        backgroundColor: 'rgba(0, 124, 186, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { stepSize: 1 }
                        }
                    }
                }
            });
        },

        initFormsChart: function() {
            const ctx = document.getElementById('sfq-forms-chart');
            if (!ctx) return;

            AppState.chartsInstances.forms = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        backgroundColor: CONFIG.CHART_COLORS.slice(0, 6),
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { padding: 20, usePointStyle: true }
                        }
                    }
                }
            });
        },

        initCountriesChart: function() {
            const ctx = document.getElementById('sfq-countries-chart');
            if (!ctx) return;

            AppState.chartsInstances.countries = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        backgroundColor: CONFIG.CHART_COLORS,
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
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

        updateCharts: function(data) {
            this.updateSubmissionsChart(data.daily_submissions);
            this.updateFormsChart(data.popular_forms);
            this.updateCountriesChart(data.countries_data);
        },

        updateSubmissionsChart: function(data) {
            if (!AppState.chartsInstances.submissions || !data) return;

            const labels = data.map(item => {
                const date = new Date(item.date);
                return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
            });
            const values = data.map(item => parseInt(item.count));

            AppState.chartsInstances.submissions.data.labels = labels;
            AppState.chartsInstances.submissions.data.datasets[0].data = values;
            AppState.chartsInstances.submissions.update();
        },

        updateFormsChart: function(data) {
            if (!AppState.chartsInstances.forms || !data) return;

            const labels = data.map(item => item.title);
            const values = data.map(item => parseInt(item.submissions));

            AppState.chartsInstances.forms.data.labels = labels;
            AppState.chartsInstances.forms.data.datasets[0].data = values;
            AppState.chartsInstances.forms.update();
        },

        updateCountriesChart: function(data) {
            if (!AppState.chartsInstances.countries || !data) return;

            let countriesArray = Array.isArray(data) ? data : Object.values(data);
            
            if (countriesArray.length > 0) {
                const labels = countriesArray.map(item => `${item.flag_emoji} ${item.country_name}`);
                const values = countriesArray.map(item => parseInt(item.count));

                AppState.chartsInstances.countries.data.labels = labels;
                AppState.chartsInstances.countries.data.datasets[0].data = values;
                AppState.chartsInstances.countries.update();
            }
        }
    };

    // Gestor de Tabla
    const TableManager = {
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
            $('#sfq-submissions-tbody-advanced').html(loadingRow);
        },

        hideLoading: function() {
            $('.sfq-loading-row').remove();
        },

        render: function(data) {
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

            data.submissions.forEach((submission, index) => {
                const row = this.createSubmissionRow(submission, index);
                tbody.append(row);
            });

            this.updateSortIndicators();
        },

        createSubmissionRow: function(submission, index) {
            const userBadge = submission.user_type === 'registered' 
                ? '<span class="sfq-badge sfq-badge-success">Registrado</span>'
                : '<span class="sfq-badge sfq-badge-secondary">Anónimo</span>';

            const scoreBadge = submission.total_score > 0 
                ? `<span class="sfq-score-badge">${submission.total_score}</span>`
                : '-';

            const countryInfo = submission.country_info || { flag_emoji: '🌍', country_name: 'Desconocido' };
            const countryBadge = `<span class="sfq-country-badge" title="${NotificationUtil.escapeHtml(countryInfo.country_name)}">${countryInfo.flag_emoji}</span>`;

            return `
                <tr data-submission-id="${submission.id}" data-index="${index}">
                    <td class="check-column">
                        <input type="checkbox" class="sfq-submission-checkbox" value="${submission.id}">
                    </td>
                    <td><strong>#${submission.id}</strong></td>
                    <td><strong>${NotificationUtil.escapeHtml(submission.form_title || 'Sin título')}</strong></td>
                    <td>
                        <div class="sfq-user-info">
                            <strong>${NotificationUtil.escapeHtml(submission.user_name)}</strong>
                            ${userBadge}
                            ${countryBadge}
                        </div>
                    </td>
                    <td><div class="sfq-date-info"><strong>${submission.formatted_date}</strong></div></td>
                    <td><span class="sfq-time-badge">${submission.time_spent_formatted}</span></td>
                    <td><span class="sfq-responses-count">${submission.response_count}</span></td>
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
        },

        updateResultsCount: function(total) {
            $('#sfq-results-count').text(total.toLocaleString());
        },

        toggleSelectAll: function() {
            const isChecked = $('#sfq-select-all').is(':checked');
            $('.sfq-submission-checkbox').prop('checked', isChecked);
            this.updateBulkActions();
        },

        updateBulkActions: function() {
            const checkedCount = $('.sfq-submission-checkbox:checked').length;
            $('.sfq-bulk-actions').toggle(checkedCount > 0);
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
            $('.sfq-sortable').removeClass('sorted asc desc');
            $(`.sfq-sortable[data-column="${AppState.currentSort.column}"]`)
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
        apply: function() {
            AppState.currentFilters = {
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
            Object.keys(AppState.currentFilters).forEach(key => {
                if (!AppState.currentFilters[key]) {
                    delete AppState.currentFilters[key];
                }
            });

            AppState.currentPage = 1;
            SubmissionsApp.loadSubmissions();
        },

        clear: function() {
            $('#sfq-filter-form, #sfq-filter-date-from, #sfq-filter-date-to, #sfq-filter-user, #sfq-filter-status, #sfq-filter-time-min, #sfq-filter-time-max, #sfq-filter-search').val('');
            
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
            
            NotificationUtil.show('Filtro guardado: ' + filterName, 'success');
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
            AjaxUtil.request('sfq_get_submission_detail', { submission_id: submissionId }, { showLoading: false })
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
                            <div class="sfq-response-question">${NotificationUtil.escapeHtml(response.question_text)}</div>
                            <div class="sfq-response-answer">${NotificationUtil.escapeHtml(response.answer_formatted)}</div>
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

            AjaxUtil.request('sfq_delete_submission', { submission_id: submissionId })
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
                NotificationUtil.show('Selecciona una acción y al menos un elemento', 'warning');
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

            AjaxUtil.request('sfq_delete_submissions_bulk', { submission_ids: ids })
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

            AjaxUtil.request('sfq_save_submission_note', { 
                submission_id: submissionId, 
                note: note 
            }, { showSuccess: false })
                .done((response) => {
                    if (response.success) {
                        NotificationUtil.show('Nota guardada correctamente', 'success');
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
                NotificationUtil.show('Selecciona al menos un campo para exportar', 'warning');
                return;
            }

            this.showProgress();

            const requestData = {
                format: format,
                fields: fields,
                options: options,
                ...AppState.currentFilters
            };

            AjaxUtil.request('sfq_export_submissions_advanced', requestData, { showLoading: false })
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
            NotificationUtil.show('Configuración de columnas guardada', 'success');
            ModalManager.close();
            SubmissionsApp.loadSubmissions();
        },

        reset: function() {
            localStorage.removeItem('sfq_columns_config');
            NotificationUtil.show('Configuración de columnas restablecida', 'success');
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
                    NotificationUtil.show('Error al cargar gráficos. Algunas funciones pueden no estar disponibles.', 'warning');
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
                    NotificationUtil.show('Error al cargar selector de fechas. Use formato YYYY-MM-DD.', 'warning');
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
            NotificationUtil.show('Datos actualizados', 'success');
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
            AjaxUtil.request('sfq_get_dashboard_stats', {}, { showLoading: false })
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

            AjaxUtil.request('sfq_get_submissions_advanced', requestData, { showLoading: false })
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
            
            AjaxUtil.request('sfq_get_form_analytics', { period }, { showLoading: false })
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
