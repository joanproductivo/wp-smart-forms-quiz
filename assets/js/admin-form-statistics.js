/**
 * Smart Forms & Quiz - Estadísticas de Formulario
 * Manejo de estadísticas detalladas por formulario con gráficos y análisis
 */

(function($) {
    'use strict';

    class SFQFormStatistics {
        constructor() {
            this.formId = $('#sfq-form-id').val();
            this.formType = $('#sfq-form-type').val();
            this.currentPeriod = 'month';
            this.charts = {};
            this.countriesData = null;
            this.init();
        }

        init() {
            this.bindEvents();
            this.loadStatistics();
            this.initCharts();
        }

        bindEvents() {
            // Tabs navigation
            $('.sfq-tab-button').on('click', (e) => {
                e.preventDefault();
                const tab = $(e.currentTarget).data('tab');
                this.switchTab(tab);
            });

            // Period filter
            $('#sfq-stats-period').on('change', (e) => {
                const period = $(e.target).val();
                this.currentPeriod = period;
                
                if (period === 'custom') {
                    $('.sfq-custom-dates').show();
                } else {
                    $('.sfq-custom-dates').hide();
                }
            });

            // Apply filters
            $('#sfq-apply-stats-filter').on('click', () => {
                this.loadStatistics();
            });

            // Refresh button
            $('#sfq-refresh-stats').on('click', () => {
                this.loadStatistics();
            });

            // Export button
            $('#sfq-export-stats').on('click', () => {
                this.exportStatistics();
            });

            // Country selector
            $('#sfq-select-country').on('change', (e) => {
                const countryCode = $(e.target).val();
                if (countryCode) {
                    this.loadCountryStatistics(countryCode);
                } else {
                    $('#sfq-country-responses').html(
                        '<p class="sfq-select-country-msg">Selecciona un país para ver el desglose de respuestas</p>'
                    );
                }
            });
        }

        switchTab(tab) {
            // Update buttons
            $('.sfq-tab-button').removeClass('active');
            $(`.sfq-tab-button[data-tab="${tab}"]`).addClass('active');
            
            // Update content
            $('.sfq-tab-content').removeClass('active');
            $(`#tab-${tab}`).addClass('active');
            
            // Load specific tab data if needed
            switch(tab) {
                case 'countries':
                    if (!this.countriesData) {
                        this.loadCountriesData();
                    }
                    break;
                case 'timeline':
                    this.updateTimelineChart();
                    break;
                case 'responses':
                    this.loadResponses();
                    break;
            }
        }

        async loadStatistics() {
            const period = $('#sfq-stats-period').val();
            const dateFrom = $('#sfq-stats-date-from').val();
            const dateTo = $('#sfq-stats-date-to').val();
            
            // Show loading state
            $('#sfq-questions-container').html(`
                <div class="sfq-loading-stats">
                    <div class="sfq-loading-spinner"></div>
                    <p>Cargando estadísticas...</p>
                </div>
            `);
            
            try {
                console.log('Loading statistics for form:', this.formId);
                
                const response = await $.ajax({
                    url: sfq_ajax.ajax_url,
                    type: 'POST',
                    data: {
                        action: 'sfq_get_form_statistics',
                        nonce: sfq_ajax.nonce,
                        form_id: this.formId,
                        period: period,
                        date_from: dateFrom,
                        date_to: dateTo
                    }
                });

                console.log('Statistics response:', response);
                
                // Log debug information if available
                if (response.data && response.data.debug) {
                    console.log('Debug info:', response.data.debug);
                }

                if (response.success) {
                    this.updateGeneralStats(response.data.general);
                    this.updateQuestionsStats(response.data.questions);
                    this.updateTimeline(response.data.timeline);
                    
                    // Show debug info in console for troubleshooting
                    if (response.data.debug) {
                        console.log('Form verification:', response.data.debug.form_verification);
                        console.log('Questions found:', response.data.debug.questions_count);
                        console.log('Total responses:', response.data.debug.total_responses_found);
                    }
                } else {
                    console.error('Error in response:', response);
                    const errorMsg = response.data && response.data.message ? 
                        response.data.message : 
                        (response.data || 'Error desconocido');
                    
                    $('#sfq-questions-container').html(`
                        <div class="sfq-no-data">
                            <span class="dashicons dashicons-warning"></span>
                            <p>Error al cargar estadísticas: ${errorMsg}</p>
                            <details style="margin-top: 10px;">
                                <summary>Información de debug</summary>
                                <pre style="font-size: 11px; background: #f1f1f1; padding: 10px; margin-top: 5px;">${JSON.stringify(response, null, 2)}</pre>
                            </details>
                        </div>
                    `);
                }
            } catch (error) {
                console.error('Error loading statistics:', error);
                $('#sfq-questions-container').html(`
                    <div class="sfq-no-data">
                        <span class="dashicons dashicons-warning"></span>
                        <p>Error de conexión al cargar estadísticas</p>
                        <details style="margin-top: 10px;">
                            <summary>Detalles del error</summary>
                            <pre style="font-size: 11px; background: #f1f1f1; padding: 10px; margin-top: 5px;">${error.toString()}</pre>
                        </details>
                    </div>
                `);
            }
        }

        updateGeneralStats(stats) {
            $('#total-responses').text(stats.total_responses.toLocaleString());
            $('#completion-rate').text(stats.completion_rate + '%');
            $('#avg-time').text(stats.avg_time);
            $('#countries-count').text(stats.countries_count);
        }

        updateQuestionsStats(questions) {
            const container = $('#sfq-questions-container');
            
            console.log('Updating questions stats:', questions);
            
            if (!questions || questions.length === 0) {
                container.html(`
                    <div class="sfq-no-data">
                        <span class="dashicons dashicons-info"></span>
                        <p>No hay datos de respuestas disponibles para este formulario</p>
                        <p style="font-size: 12px; color: #666; margin-top: 10px;">
                            Esto puede ocurrir si:<br>
                            • No hay respuestas completadas para este formulario<br>
                            • El formulario no tiene preguntas configuradas<br>
                            • Los filtros de fecha están excluyendo todas las respuestas
                        </p>
                    </div>
                `);
                return;
            }
            
            // Check if questions have any responses
            const hasAnyResponses = questions.some(q => q.total_responses > 0);
            if (!hasAnyResponses) {
                container.html(`
                    <div class="sfq-no-data">
                        <span class="dashicons dashicons-info"></span>
                        <p>Las preguntas de este formulario no tienen respuestas aún</p>
                        <p style="font-size: 12px; color: #666; margin-top: 10px;">
                            Se encontraron ${questions.length} preguntas pero ninguna tiene respuestas completadas.
                        </p>
                    </div>
                `);
                return;
            }
            
            let html = '';
            
            questions.forEach((question, index) => {
                const chartId = `chart-question-${index}`;
                
                html += `
                    <div class="sfq-question-stat-card">
                        <div class="sfq-question-header">
                            <h3>${this.escapeHtml(question.question_text)}</h3>
                            <span class="sfq-response-count">${question.total_responses} respuestas</span>
                        </div>
                        <div class="sfq-question-content">
                            <div class="sfq-options-list">
                                ${this.renderOptions(question.options)}
                            </div>
                            <div class="sfq-chart-container">
                                <canvas id="${chartId}" width="300" height="300"></canvas>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            container.html(html);
            
            // Hide loading and show content
            $('.sfq-loading-stats').hide();
            
            // Create charts for each question after DOM is updated
            setTimeout(() => {
                questions.forEach((question, index) => {
                    const chartId = `chart-question-${index}`;
                    this.createQuestionChart(question, chartId);
                });
            }, 100);
        }

        renderOptions(options) {
            if (!options || options.length === 0) {
                return '<p>No hay opciones disponibles</p>';
            }
            
            return options.map(option => `
                <div class="sfq-option-stat">
                    <div class="sfq-option-info">
                        <span class="sfq-option-text">${this.escapeHtml(option.option)}</span>
                        <span class="sfq-option-count">${option.count} (${option.percentage}%)</span>
                    </div>
                    <div class="sfq-option-bar">
                        <div class="sfq-option-bar-fill" style="width: ${option.percentage}%"></div>
                    </div>
                </div>
            `).join('');
        }

        createQuestionChart(question, canvasId) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) {
                console.error('Canvas not found:', canvasId);
                return;
            }
            
            const ctx = canvas.getContext('2d');
            
            // Skip if no options or all counts are 0
            if (!question.options || question.options.length === 0) {
                console.log('No options for question:', question.question_text);
                return;
            }
            
            // Prepare data
            const labels = question.options.map(opt => 
                opt.option.length > 20 ? opt.option.substring(0, 20) + '...' : opt.option
            );
            const data = question.options.map(opt => opt.count || 0);
            const colors = this.generateColors(question.options.length);
            
            // Skip chart if all values are 0
            const hasData = data.some(value => value > 0);
            if (!hasData) {
                canvas.parentElement.innerHTML = '<p style="text-align: center; color: #646970;">Sin respuestas aún</p>';
                return;
            }
            
            // Create chart
            try {
                new Chart(ctx, {
                    type: question.question_type === 'rating' ? 'bar' : 'doughnut',
                    data: {
                        labels: labels,
                        datasets: [{
                            data: data,
                            backgroundColor: colors,
                            borderWidth: 2,
                            borderColor: '#fff'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    padding: 10,
                                    font: {
                                        size: 11
                                    }
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const label = context.label || '';
                                        const value = context.parsed || 0;
                                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                        return `${label}: ${value} (${percentage}%)`;
                                    }
                                }
                            }
                        }
                    }
                });
            } catch (error) {
                console.error('Error creating chart:', error);
                canvas.parentElement.innerHTML = '<p style="text-align: center; color: #dc3232;">Error al crear gráfico</p>';
            }
        }

        async loadCountriesData() {
            const period = $('#sfq-stats-period').val();
            
            try {
                const response = await $.ajax({
                    url: sfq_ajax.ajax_url,
                    type: 'POST',
                    data: {
                        action: 'sfq_get_form_country_stats',
                        nonce: sfq_ajax.nonce,
                        form_id: this.formId,
                        period: period
                    }
                });

                if (response.success) {
                    this.countriesData = response.data;
                    this.updateCountriesDisplay(response.data);
                }
            } catch (error) {
                console.error('Error loading countries data:', error);
            }
        }

        updateCountriesDisplay(data) {
            // Update countries table
            const tableHtml = data.countries.map(country => `
                <div class="sfq-country-row">
                    <span class="sfq-country-flag">${country.flag_emoji}</span>
                    <span class="sfq-country-name">${country.country_name}</span>
                    <span class="sfq-country-count">${country.count}</span>
                    <span class="sfq-country-percentage">${country.percentage}%</span>
                    <div class="sfq-country-bar">
                        <div class="sfq-country-bar-fill" style="width: ${country.percentage}%"></div>
                    </div>
                </div>
            `).join('');
            
            $('#sfq-countries-table').html(tableHtml || '<p>No hay datos de países disponibles</p>');
            
            // Update country selector
            const selectOptions = '<option value="">Selecciona un país</option>' + 
                data.countries.map(country => 
                    `<option value="${country.country_code}">${country.flag_emoji} ${country.country_name}</option>`
                ).join('');
            
            $('#sfq-select-country').html(selectOptions);
            $('#sfq-filter-country-responses').html(selectOptions);
            
            // Create countries chart
            this.createCountriesChart(data.countries);
        }

        createCountriesChart(countries) {
            const canvas = document.getElementById('sfq-countries-chart');
            if (!canvas) return;
            
            const ctx = canvas.getContext('2d');
            
            // Destroy existing chart if exists
            if (this.charts.countries) {
                this.charts.countries.destroy();
            }
            
            // Take top 10 countries for the chart
            const topCountries = countries.slice(0, 10);
            
            this.charts.countries = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: topCountries.map(c => c.country_name),
                    datasets: [{
                        label: 'Respuestas',
                        data: topCountries.map(c => c.count),
                        backgroundColor: '#007cba',
                        borderColor: '#005a87',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = context.parsed.y;
                                    const percentage = countries[context.dataIndex].percentage;
                                    return `Respuestas: ${value} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }

        async loadCountryStatistics(countryCode) {
            const period = $('#sfq-stats-period').val();
            
            try {
                const response = await $.ajax({
                    url: sfq_ajax.ajax_url,
                    type: 'POST',
                    data: {
                        action: 'sfq_get_form_country_stats',
                        nonce: sfq_ajax.nonce,
                        form_id: this.formId,
                        period: period,
                        country_code: countryCode
                    }
                });

                if (response.success && response.data.questions) {
                    this.displayCountryResponses(response.data.questions, countryCode);
                }
            } catch (error) {
                console.error('Error loading country statistics:', error);
            }
        }

        displayCountryResponses(questions, countryCode) {
            const container = $('#sfq-country-responses');
            
            const html = questions.map(question => `
                <div class="sfq-country-question">
                    <h4>${this.escapeHtml(question.question_text)}</h4>
                    <div class="sfq-country-options">
                        ${question.options.map(opt => `
                            <div class="sfq-country-option">
                                <span>${this.escapeHtml(opt.option)}</span>
                                <span>${opt.count} (${opt.percentage}%)</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('');
            
            container.html(html);
        }

        updateTimeline(timelineData) {
            if (!timelineData) return;
            
            // Update stats cards
            $('#best-day').text(timelineData.best_day.date ? 
                `${timelineData.best_day.date} (${timelineData.best_day.count})` : '-');
            $('#daily-avg').text(timelineData.daily_avg || '-');
            
            const trendIcon = timelineData.trend === 'increasing' ? '📈' : 
                             timelineData.trend === 'decreasing' ? '📉' : '➡️';
            $('#trend').text(trendIcon + ' ' + this.getTrendText(timelineData.trend));
        }

        updateTimelineChart() {
            // This will be called when timeline tab is activated
            // Chart creation logic here
        }

        getTrendText(trend) {
            const texts = {
                'increasing': 'Creciendo',
                'decreasing': 'Decreciendo',
                'stable': 'Estable'
            };
            return texts[trend] || 'Estable';
        }

        async loadResponses(page = 1) {
            const search = $('#sfq-search-responses').val();
            const country = $('#sfq-filter-country-responses').val();
            
            try {
                const response = await $.ajax({
                    url: sfq_ajax.ajax_url,
                    type: 'POST',
                    data: {
                        action: 'sfq_get_submissions_advanced',
                        nonce: sfq_ajax.nonce,
                        form_id: this.formId,
                        page: page,
                        per_page: 25,
                        search: search,
                        country: country
                    }
                });

                if (response.success) {
                    this.displayResponses(response.data);
                }
            } catch (error) {
                console.error('Error loading responses:', error);
            }
        }

        displayResponses(data) {
            const tbody = $('#sfq-responses-tbody');
            
            if (!data.submissions || data.submissions.length === 0) {
                tbody.html('<tr><td colspan="6">No hay respuestas disponibles</td></tr>');
                return;
            }
            
            const html = data.submissions.map(submission => `
                <tr>
                    <td>${submission.id}</td>
                    <td>${this.escapeHtml(submission.user_name)}</td>
                    <td>${submission.country_info ? 
                        `${submission.country_info.flag_emoji} ${submission.country_info.country_name}` : 
                        'Desconocido'}</td>
                    <td>${submission.formatted_date}</td>
                    <td>${submission.time_spent_formatted}</td>
                    <td>
                        <button class="button button-small sfq-view-response" data-id="${submission.id}">
                            Ver
                        </button>
                    </td>
                </tr>
            `).join('');
            
            tbody.html(html);
            
            // Update pagination
            this.updatePagination(data.current_page, data.pages);
        }

        updatePagination(currentPage, totalPages) {
            const container = $('#sfq-responses-pagination');
            
            if (totalPages <= 1) {
                container.empty();
                return;
            }
            
            let html = '';
            
            // Previous button
            if (currentPage > 1) {
                html += `<button class="button" data-page="${currentPage - 1}">‹</button>`;
            }
            
            // Page numbers
            for (let i = 1; i <= totalPages; i++) {
                if (i === currentPage) {
                    html += `<button class="button button-primary" disabled>${i}</button>`;
                } else if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                    html += `<button class="button" data-page="${i}">${i}</button>`;
                } else if (i === currentPage - 3 || i === currentPage + 3) {
                    html += `<span>...</span>`;
                }
            }
            
            // Next button
            if (currentPage < totalPages) {
                html += `<button class="button" data-page="${currentPage + 1}">›</button>`;
            }
            
            container.html(html);
            
            // Bind pagination events
            container.find('button[data-page]').on('click', (e) => {
                const page = $(e.target).data('page');
                this.loadResponses(page);
            });
        }

        async exportStatistics() {
            const period = $('#sfq-stats-period').val();
            
            try {
                const response = await $.ajax({
                    url: sfq_ajax.ajax_url,
                    type: 'POST',
                    data: {
                        action: 'sfq_export_form_statistics',
                        nonce: sfq_ajax.nonce,
                        form_id: this.formId,
                        period: period
                    }
                });

                if (response.success) {
                    // Download the file
                    window.location.href = response.data.file_url;
                    this.showNotice('Estadísticas exportadas correctamente', 'success');
                }
            } catch (error) {
                console.error('Error exporting statistics:', error);
                this.showNotice('Error al exportar estadísticas', 'error');
            }
        }

        initCharts() {
            // Initialize Chart.js with default settings
            Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            Chart.defaults.font.size = 12;
            Chart.defaults.color = '#333';
        }

        generateColors(count) {
            const colors = [
                '#007cba', '#00a0d2', '#0073aa', '#33b3db', '#2271b1',
                '#135e96', '#0a4b78', '#72aee6', '#3582c4', '#2c3338'
            ];
            
            if (count <= colors.length) {
                return colors.slice(0, count);
            }
            
            // Generate additional colors if needed
            const generated = [...colors];
            for (let i = colors.length; i < count; i++) {
                const hue = (i * 360 / count) % 360;
                generated.push(`hsl(${hue}, 60%, 50%)`);
            }
            return generated;
        }

        showLoading() {
            $('.sfq-loading-stats').show();
            $('.sfq-questions-stats').hide();
        }

        hideLoading() {
            $('.sfq-loading-stats').hide();
            $('.sfq-questions-stats').show();
        }

        showError(message) {
            this.showNotice(message, 'error');
        }

        showNotice(message, type = 'success') {
            const noticeId = 'notice_' + Date.now();
            const html = `
                <div id="${noticeId}" class="notice notice-${type} is-dismissible">
                    <p>${this.escapeHtml(message)}</p>
                </div>
            `;
            
            $('.sfq-statistics-wrap').prepend(html);
            
            setTimeout(() => {
                $(`#${noticeId}`).fadeOut(300, function() {
                    $(this).remove();
                });
            }, 4000);
        }

        escapeHtml(text) {
            if (typeof text !== 'string') return '';
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return text.replace(/[&<>"']/g, m => map[m]);
        }
    }

    // Initialize when DOM is ready
    $(document).ready(function() {
        // Only initialize on statistics page
        if ($('.sfq-statistics-wrap').length > 0) {
            // Load Chart.js if not already loaded
            if (typeof Chart === 'undefined') {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
                script.onload = function() {
                    new SFQFormStatistics();
                };
                document.head.appendChild(script);
            } else {
                new SFQFormStatistics();
            }
        }
    });

})(jQuery);
