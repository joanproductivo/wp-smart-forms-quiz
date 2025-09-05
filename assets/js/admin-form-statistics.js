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
            this.loadVisitorsAnalytics();
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
                   this.loadVisitorsAnalytics();
            });

            // Refresh button
            $('#sfq-refresh-stats').on('click', () => {
                 this.loadVisitorsAnalytics();
            });

            // Export button
            $('#sfq-export-stats').on('click', () => {
                this.exportStatistics();
            });

            // ✅ NUEVO: Selector de período en pestaña de abandono
            $('#sfq-abandonment-timeline-period').on('change', (e) => {
                const period = $(e.target).val();
                // Actualizar el período principal para que afecte a todas las estadísticas
                $('#sfq-stats-period').val(period);
                this.currentPeriod = period;
                // Recargar analytics de abandono con el nuevo período
                this.loadAbandonmentAnalytics();
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
                case 'abandonment':
                    this.loadAbandonmentAnalytics();
                    break;
                case 'responses':
                    this.loadResponses();
                    break;
                case 'questions':
                    this.loadStatistics();
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

                if (response.success) {
                    this.updateGeneralStats(response.data.general);
                    this.updateQuestionsStats(response.data.questions);
                    this.updateTimeline(response.data.timeline);
                } else {
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
        
        // ✅ CORREGIDO: Aplicar la misma lógica de clases CSS que en admin-forms-list.js
        const completionRateElement = $('#completion-rate');
        const rateValue = parseFloat(stats.completion_rate) || 0;
        completionRateElement.text(rateValue + '%');
        
        // Aplicar clases CSS según el valor de la tasa (misma lógica que rate-1, rate-2, etc.)
        if (rateValue >= 70) {
            completionRateElement.addClass('sfq-rate-high').removeClass('sfq-rate-medium sfq-rate-low');
        } else if (rateValue >= 40) {
            completionRateElement.addClass('sfq-rate-medium').removeClass('sfq-rate-high sfq-rate-low');
        } else {
            completionRateElement.addClass('sfq-rate-low').removeClass('sfq-rate-high sfq-rate-medium');
        }
        
        $('#avg-time').text(stats.avg_time);
        $('#countries-count').text(stats.countries_count);
        $('#partial-responses').text(stats.partial_responses || 0);
    }

        updateQuestionsStats(questions) {
            const container = $('#sfq-questions-container');
            
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
                if (question.question_type === 'freestyle') {
                    html += this.renderFreestyleQuestion(question, index);
                } else {
                    const chartId = `chart-question-${index}`;
                    
                    html += `
                        <div class="sfq-question-stat-card">
                            <div class="sfq-question-header">
                                <h3>${this.escapeHtml(question.question_text)}</h3>
                                <span class="sfq-response-count">${question.total_responses} respuestas</span>
                            </div>
                            <div class="sfq-question-content">
                                <div class="sfq-options-list">
                                    ${this.renderOptions(question.options, index)}
                                </div>
                                <div class="sfq-chart-container">
                                    <canvas id="${chartId}" width="300" height="300"></canvas>
                                </div>
                            </div>
                        </div>
                    `;
                }
            });
            
            container.html(html);
            
            // Hide loading and show content
            $('.sfq-loading-stats').hide();
            
            // Create charts for each question after DOM is updated
            setTimeout(() => {
                questions.forEach((question, index) => {
                    if (question.question_type !== 'freestyle') {
                        const chartId = `chart-question-${index}`;
                        this.createQuestionChart(question, chartId);
                    }
                });
                
                // Bind country toggle events
                this.bindCountryToggleEvents();
                
                // Bind freestyle events
                this.bindFreestyleEvents();
            }, 100);
        }

        renderOptions(options, questionIndex) {
            if (!options || options.length === 0) {
                return '<p>No hay opciones disponibles</p>';
            }
            
            // CORREGIDO: Verificar si alguna opción tiene datos de países (incluso arrays vacíos cuentan como "tiene datos")
            const hasAnyCountriesData = options.some(option => 
                option.countries_data !== undefined && option.countries_data !== null
            );
            
            let html = '';
            
            // CORREGIDO: Mostrar botón para expandir/colapsar todos SIEMPRE que haya countries_data definido
            if (hasAnyCountriesData) {
                html += `
                    <div class="sfq-expand-all-countries">
                        <button class="sfq-expand-all-btn" data-question="${questionIndex}" title="Expandir/colapsar todos los países">
                            <span class="dashicons dashicons-admin-site-alt3"></span>
                            <span class="sfq-expand-all-text">Mostrar todos los países</span>
                        </button>
                    </div>
                `;
            }
            
            html += options.map((option, optionIndex) => {
                // CORREGIDO: Verificar si tiene datos de países (incluso si está vacío)
                const hasCountriesData = option.countries_data !== undefined && option.countries_data !== null;
                const hasCountriesContent = hasCountriesData && option.countries_data.length > 0;
                const optionId = `option-q${questionIndex}-o${optionIndex}-${Date.now()}`;
                
                return `
                    <div class="sfq-option-stat">
                        <div class="sfq-option-info">
                            <span class="sfq-option-text">${this.escapeHtml(option.option)}</span>
                            <span class="sfq-option-count">${option.count} (${option.percentage}%)</span>
                            ${hasCountriesData ? `
                                <button class="sfq-countries-toggle" data-target="${optionId}" title="Ver desglose por países">
                                    <span class="dashicons dashicons-admin-site-alt3"></span>
                                </button>
                            ` : ''}
                        </div>
                        <div class="sfq-option-bar">
                            <div class="sfq-option-bar-fill" style="width: ${option.percentage}%"></div>
                        </div>
                        ${hasCountriesData ? `
                            <div class="sfq-countries-breakdown" id="${optionId}" style="display: none;">
                                <div class="sfq-countries-header">
                                    <h5>Desglose por países</h5>
                                    <span class="sfq-countries-total">${option.count} respuestas</span>
                                </div>
                                <div class="sfq-countries-list">
                                    ${hasCountriesContent ? 
                                        this.renderCountriesBreakdown(option.countries_data) : 
                                        '<p class="sfq-no-countries">No hay datos de países disponibles para esta opción</p>'
                                    }
                                </div>
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');
            
            return html;
        }

        renderCountriesBreakdown(countriesData) {
            if (!countriesData || countriesData.length === 0) {
                return '<p class="sfq-no-countries">No hay datos de países disponibles</p>';
            }
            
            return countriesData.map(country => `
                <div class="sfq-country-item">
                    <span class="sfq-country-flag">${country.flag_emoji}</span>
                    <span class="sfq-country-name">${this.escapeHtml(country.country_name)}</span>
                    <span class="sfq-country-stats">
                        <span class="sfq-country-count">${country.count}</span>
                        <span class="sfq-country-percentage">(${country.percentage}%)</span>
                    </span>
                    <div class="sfq-country-mini-bar">
                        <div class="sfq-country-mini-bar-fill" style="width: ${country.percentage}%"></div>
                    </div>
                </div>
            `).join('');
        }

        bindCountryToggleEvents() {
            // Handle country breakdown toggle
            $(document).off('click', '.sfq-countries-toggle').on('click', '.sfq-countries-toggle', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const button = $(e.currentTarget);
                const targetId = button.data('target');
                const breakdown = $(`#${targetId}`);
                const icon = button.find('.dashicons');
                
                if (breakdown.is(':visible')) {
                    // Collapse
                    breakdown.slideUp(200);
                    icon.removeClass('dashicons-dismiss').addClass('dashicons-admin-site-alt3');
                    button.attr('title', 'Ver desglose por países');
                } else {
                    // Expand
                    breakdown.slideDown(200);
                    icon.removeClass('dashicons-admin-site-alt3').addClass('dashicons-dismiss');
                    button.attr('title', 'Ocultar desglose por países');
                }
            });

            // Handle expand/collapse all countries for a question
            $(document).off('click', '.sfq-expand-all-btn').on('click', '.sfq-expand-all-btn', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const button = $(e.currentTarget);
                const questionIndex = button.data('question');
                const questionCard = button.closest('.sfq-question-stat-card');
                const allBreakdowns = questionCard.find('.sfq-countries-breakdown');
                const allToggleButtons = questionCard.find('.sfq-countries-toggle');
                const buttonIcon = button.find('.dashicons');
                const buttonText = button.find('.sfq-expand-all-text');
                
                // Verificar si alguno está visible
                const anyVisible = allBreakdowns.filter(':visible').length > 0;
                
                if (anyVisible) {
                    // Colapsar todos
                    allBreakdowns.slideUp(200);
                    allToggleButtons.each(function() {
                        const icon = $(this).find('.dashicons');
                        icon.removeClass('dashicons-dismiss').addClass('dashicons-admin-site-alt3');
                        $(this).attr('title', 'Ver desglose por países');
                    });
                    buttonIcon.removeClass('dashicons-dismiss').addClass('dashicons-admin-site-alt3');
                    buttonText.text('Mostrar todos los países');
                    button.attr('title', 'Expandir todos los países');
                } else {
                    // Expandir todos
                    allBreakdowns.slideDown(200);
                    allToggleButtons.each(function() {
                        const icon = $(this).find('.dashicons');
                        icon.removeClass('dashicons-admin-site-alt3').addClass('dashicons-dismiss');
                        $(this).attr('title', 'Ocultar desglose por países');
                    });
                    buttonIcon.removeClass('dashicons-admin-site-alt3').addClass('dashicons-dismiss');
                    buttonText.text('Ocultar todos los países');
                    button.attr('title', 'Colapsar todos los países');
                }
            });
        }

        createQuestionChart(question, canvasId) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) {
                return;
            }
            
            const ctx = canvas.getContext('2d');
            
            // Skip if no options or all counts are 0
            if (!question.options || question.options.length === 0) {
                return;
            }
            
            // Prepare data
            const labels = question.options.map(opt => 
                opt.option.length > 20 ? opt.option.substring(0, 20) + '...' : opt.option
            );
            const data = question.options.map(opt => opt.count || 0);
            const percentages = question.options.map(opt => opt.percentage || 0); // CORREGIDO: Usar porcentajes del backend
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
                                        let value;
                                        
                                        // CORREGIDO: Manejar diferentes tipos de datos de Chart.js
                                        if (question.question_type === 'rating') {
                                            // Para gráficos de barras (rating)
                                            value = context.parsed.y || 0;
                                        } else {
                                            // Para gráficos de dona (single_choice, multiple_choice, etc.)
                                            value = context.parsed || 0;
                                        }
                                        
                                        // CORREGIDO: Usar el porcentaje correcto del backend
                                        const percentage = percentages[context.dataIndex] || 0;
                                        return `${label}: ${value} (${percentage}%)`;
                                    }
                                }
                            }
                        }
                    }
                });
            } catch (error) {
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
            
            // Store timeline data for chart creation
            this.timelineData = timelineData;
            
            // Update stats cards
            $('#best-day').text(timelineData.best_day.date ? 
                `${timelineData.best_day.date} (${timelineData.best_day.count})` : '-');
            $('#daily-avg').text(timelineData.daily_avg || '-');
            
            const trendIcon = timelineData.trend === 'increasing' ? '📈' : 
                             timelineData.trend === 'decreasing' ? '📉' : '➡️';
            $('#trend').text(trendIcon + ' ' + this.getTrendText(timelineData.trend));
        }

        updateTimelineChart() {
            // Create timeline chart when tab is activated
            if (!this.timelineData || !this.timelineData.daily_data) {
                return;
            }
            
            const canvas = document.getElementById('sfq-timeline-chart');
            if (!canvas) {
                return;
            }
            
            const ctx = canvas.getContext('2d');
            
            // Destroy existing chart and cleanup observers
            if (this.charts.timeline) {
                this.charts.timeline.destroy();
                this.charts.timeline = null;
            }
            
            // Cleanup previous resize observer
            if (this.charts.timelineResizeObserver) {
                this.charts.timelineResizeObserver.disconnect();
                this.charts.timelineResizeObserver = null;
            }
            
            // Prepare data
            const dailyData = this.timelineData.daily_data;
            
            // Validate data
            if (!dailyData || dailyData.length === 0) {
                canvas.parentElement.innerHTML = '<p style="text-align: center; color: #646970; padding: 40px;">No hay datos de timeline disponibles</p>';
                return;
            }
            
            const labels = dailyData.map(item => {
                const date = new Date(item.date);
                return date.toLocaleDateString('es-ES', { 
                    month: 'short', 
                    day: 'numeric' 
                });
            });
            const data = dailyData.map(item => parseInt(item.count) || 0);
            
            // Reset canvas to default size and let Chart.js handle responsiveness
            canvas.style.width = '';
            canvas.style.height = '';
            canvas.removeAttribute('width');
            canvas.removeAttribute('height');
            
            // Create timeline chart with proper responsive settings
            try {
                this.charts.timeline = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Respuestas por día',
                            data: data,
                            borderColor: '#007cba',
                            backgroundColor: 'rgba(0, 124, 186, 0.1)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.4,
                            pointBackgroundColor: '#007cba',
                            pointBorderColor: '#fff',
                            pointBorderWidth: 2,
                            pointRadius: 4,
                            pointHoverRadius: 6
                        }]
                    },
                    options: {
                        responsive: true, // Enable responsive behavior
                        maintainAspectRatio: false, // Allow flexible aspect ratio
                        animation: {
                            duration: 750,
                            easing: 'easeInOutQuart'
                        },
                        layout: {
                            padding: {
                                top: 10,
                                right: 10,
                                bottom: 10,
                                left: 10
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    stepSize: 1,
                                    maxTicksLimit: 8
                                },
                                grid: {
                                    color: 'rgba(0, 0, 0, 0.1)'
                                }
                            },
                            x: {
                                grid: {
                                    display: false
                                },
                                ticks: {
                                    maxTicksLimit: 10,
                                    maxRotation: 45
                                }
                            }
                        },
                        plugins: {
                            legend: {
                                display: false
                            },
                            tooltip: {
                                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                titleColor: '#fff',
                                bodyColor: '#fff',
                                borderColor: '#007cba',
                                borderWidth: 1,
                                callbacks: {
                                    title: function(context) {
                                        return context[0].label;
                                    },
                                    label: function(context) {
                                        return `Respuestas: ${context.parsed.y}`;
                                    }
                                }
                            }
                        },
                        interaction: {
                            intersect: false,
                            mode: 'index'
                        },
                        elements: {
                            point: {
                                hoverRadius: 8
                            }
                        }
                    }
                });
                
            } catch (error) {
                canvas.parentElement.innerHTML = '<p style="text-align: center; color: #dc3232; padding: 40px;">Error al crear el gráfico de timeline</p>';
            }
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

        /**
         * Renderizar pregunta freestyle
         */
        renderFreestyleQuestion(question, questionIndex) {
            const questionId = `freestyle-question-${questionIndex}`;
            
            let html = `
                <div class="sfq-freestyle-question-card">
                    <div class="sfq-freestyle-header">
                        <div class="sfq-freestyle-title">
                            <span class="sfq-freestyle-icon">🎨</span>
                            <h3>${this.escapeHtml(question.question_text)}</h3>
                        </div>
                        <div class="sfq-freestyle-summary">
                            <span class="sfq-total-responses">${question.total_responses} respuestas</span>
                            <span class="sfq-elements-count">${question.elements.length} elementos</span>
                        </div>
                        <div class="sfq-freestyle-actions">
                            <button class="sfq-expand-all-elements" data-question="${questionIndex}">
                                <span class="dashicons dashicons-arrow-down-alt2"></span>
                                <span class="sfq-expand-text">Expandir Todo</span>
                            </button>
                            <button class="sfq-expand-all-countries-freestyle" data-question="${questionIndex}">
                                <span class="dashicons dashicons-admin-site-alt3"></span>
                                <span class="sfq-expand-countries-text">Mostrar países</span>
                            </button>
                        </div>
                    </div>
                    <div class="sfq-freestyle-elements" id="${questionId}">
            `;
            
            // Renderizar cada elemento
            question.elements.forEach((element, elementIndex) => {
                html += this.renderFreestyleElement(element, questionIndex, elementIndex);
            });
            
            html += `
                    </div>
                </div>
            `;
            
            return html;
        }

        /**
         * Renderizar elemento freestyle individual
         */
        renderFreestyleElement(element, questionIndex, elementIndex) {
            const elementId = `element-${questionIndex}-${elementIndex}`;
            const elementIcon = this.getElementIcon(element.type);
            
            let html = `
                <div class="sfq-freestyle-element" data-element-type="${element.type}">
                    <div class="sfq-element-header" data-toggle="${elementId}">
                        <div class="sfq-element-info">
                            <span class="sfq-element-icon">${elementIcon}</span>
                            <span class="sfq-element-label">${this.escapeHtml(element.label)}</span>
                            <span class="sfq-element-type">(${this.getElementTypeName(element.type)})</span>
                        </div>
                        <div class="sfq-element-stats">
                            <span class="sfq-element-responses">${element.total_responses} respuestas</span>
                            <span class="sfq-element-toggle">
                                <span class="dashicons dashicons-arrow-down-alt2"></span>
                            </span>
                        </div>
                    </div>
                    <div class="sfq-element-content" id="${elementId}" style="display: none;">
                        ${this.renderElementStats(element)}
                    </div>
                </div>
            `;
            
            return html;
        }

        /**
         * Renderizar estadísticas específicas del elemento
         */
        renderElementStats(element) {
            switch (element.type) {
                case 'text':
                case 'email':
                case 'phone':
                    return this.renderTextElementStats(element);
                    
                case 'rating':
                    return this.renderRatingElementStats(element);
                    
                case 'dropdown':
                    return this.renderDropdownElementStats(element);
                    
                case 'checkbox':
                    return this.renderCheckboxElementStats(element);
                    
                case 'button':
                case 'image':
                    return this.renderInteractionElementStats(element);
                    
                case 'file_upload':
                    return this.renderFileElementStats(element);
                    
                case 'legal_text':
                    return this.renderLegalElementStats(element);
                    
                default:
                    return this.renderGenericElementStats(element);
            }
        }

        /**
         * Renderizar estadísticas de elementos de texto
         */
        renderTextElementStats(element) {
            let html = `
                <div class="sfq-element-stats-grid">
                    <div class="sfq-stat-card">
                        <div class="sfq-stat-value">${element.total_responses}</div>
                        <div class="sfq-stat-label">Total Respuestas</div>
                    </div>
                    <div class="sfq-stat-card">
                        <div class="sfq-stat-value">${element.unique_responses || 0}</div>
                        <div class="sfq-stat-label">Respuestas Únicas</div>
                    </div>
                    <div class="sfq-stat-card">
                        <div class="sfq-stat-value">${element.avg_length || 0}</div>
                        <div class="sfq-stat-label">Longitud Promedio</div>
                    </div>
                </div>
            `;

            // Mostrar respuestas más comunes
            if (element.most_common && element.most_common.length > 0) {
                // Verificar si alguna respuesta común tiene datos de países
                const hasAnyCountriesData = element.most_common.some(item => 
                    item.countries_data && item.countries_data.length > 0
                );
                
                html += `
                    <div class="sfq-most-common">
                        <div class="sfq-most-common-header">
                            <h5>Respuestas Más Comunes</h5>
                            ${hasAnyCountriesData ? `
                                <button class="sfq-expand-all-btn sfq-expand-all-countries-text" data-element="${element.id}" title="Expandir/colapsar todos los países">
                                    <span class="dashicons dashicons-admin-site-alt3"></span>
                                    <span class="sfq-expand-countries-text">Mostrar países</span>
                                </button>
                            ` : ''}
                        </div>
                        <div class="sfq-common-list">
                `;
                
                element.most_common.forEach((item, index) => {
                    const hasCountriesData = item.countries_data && item.countries_data.length > 0;
                    const itemId = `common-item-${element.id}-${index}`;
                    
                    html += `
                        <div class="sfq-common-item">
                            <div class="sfq-common-info">
                                <span class="sfq-common-text">${this.escapeHtml(item.value)}</span>
                                <span class="sfq-common-stats">${item.count} (${item.percentage}%)</span>
                                ${hasCountriesData ? `
                                    <button class="sfq-countries-toggle" data-target="${itemId}" title="Ver desglose por países">
                                        <span class="dashicons dashicons-admin-site-alt3"></span>
                                    </button>
                                ` : ''}
                            </div>
                            <div class="sfq-common-bar">
                                <div class="sfq-common-bar-fill" style="width: ${item.percentage}%"></div>
                            </div>
                            ${hasCountriesData ? `
                                <div class="sfq-countries-breakdown" id="${itemId}" style="display: none;">
                                    <div class="sfq-countries-header">
                                        <h6>Desglose por países</h6>
                                        <span class="sfq-countries-total">${item.count} respuestas</span>
                                    </div>
                                    <div class="sfq-countries-list">
                                        ${this.renderCountriesBreakdown(item.countries_data)}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    `;
                });
                
                html += `
                        </div>
                    </div>
                `;
            }

            // Análisis específico para emails
            if (element.type === 'email' && element.specific_stats && element.specific_stats.top_domains) {
                html += `
                    <div class="sfq-email-domains">
                        <h5>Dominios Más Comunes</h5>
                        <div class="sfq-domains-list">
                `;
                
                Object.entries(element.specific_stats.top_domains).forEach(([domain, count]) => {
                    const percentage = element.total_responses > 0 ? 
                        Math.round((count / element.total_responses) * 100) : 0;
                    html += `
                        <div class="sfq-domain-item">
                            <span class="sfq-domain-name">@${domain}</span>
                            <span class="sfq-domain-count">${count} (${percentage}%)</span>
                        </div>
                    `;
                });
                
                html += `
                        </div>
                    </div>
                `;
            }

            return html;
        }

        /**
         * Renderizar estadísticas de elementos rating
         */
        renderRatingElementStats(element) {
            const chartId = `rating-chart-${element.id}`;
            
            let html = `
                <div class="sfq-element-stats-grid">
                    <div class="sfq-stat-card">
                        <div class="sfq-stat-value">${element.total_responses}</div>
                        <div class="sfq-stat-label">Total Respuestas</div>
                    </div>
                    <div class="sfq-stat-card">
                        <div class="sfq-stat-value">${element.average_rating || 0}</div>
                        <div class="sfq-stat-label">Promedio</div>
                    </div>
                    <div class="sfq-stat-card">
                        <div class="sfq-stat-value">${element.max_rating || 5}</div>
                        <div class="sfq-stat-label">Máximo</div>
                    </div>
                </div>
                
                <div class="sfq-rating-distribution">
                    <h5>Distribución de Puntuaciones</h5>
                    <div class="sfq-rating-bars">
            `;

            if (element.distribution) {
                element.distribution.forEach(item => {
                    html += `
                        <div class="sfq-rating-bar-item">
                            <span class="sfq-rating-label">${item.label}</span>
                            <div class="sfq-rating-bar">
                                <div class="sfq-rating-bar-fill" style="width: ${item.percentage}%"></div>
                            </div>
                            <span class="sfq-rating-count">${item.count} (${item.percentage}%)</span>
                        </div>
                    `;
                });
            }

            html += `
                    </div>
                </div>
                
                <div class="sfq-chart-container">
                    <canvas id="${chartId}" width="300" height="200"></canvas>
                </div>
            `;

            // Crear gráfico después de que se renderice
            setTimeout(() => {
                this.createRatingChart(element, chartId);
            }, 100);

            return html;
        }

        /**
         * Renderizar estadísticas de elementos dropdown
         */
        renderDropdownElementStats(element) {
            const chartId = `dropdown-chart-${element.id}`;
            
            let html = `
                <div class="sfq-element-stats-grid">
                    <div class="sfq-stat-card">
                        <div class="sfq-stat-value">${element.total_responses}</div>
                        <div class="sfq-stat-label">Total Respuestas</div>
                    </div>
                </div>
                
                <div class="sfq-dropdown-distribution">
                    <h5>Distribución de Opciones</h5>
                    <div class="sfq-option-bars">
            `;

            if (element.distribution) {
                element.distribution.forEach(item => {
                    html += `
                        <div class="sfq-option-bar-item">
                            <span class="sfq-option-label">${this.escapeHtml(item.option)}</span>
                            <div class="sfq-option-bar">
                                <div class="sfq-option-bar-fill" style="width: ${item.percentage}%"></div>
                            </div>
                            <span class="sfq-option-count">${item.count} (${item.percentage}%)</span>
                        </div>
                    `;
                });
            }

            html += `
                    </div>
                </div>
                
                <div class="sfq-chart-container">
                    <canvas id="${chartId}" width="300" height="200"></canvas>
                </div>
            `;

            // Crear gráfico después de que se renderice
            setTimeout(() => {
                this.createDropdownChart(element, chartId);
            }, 100);

            return html;
        }

        /**
         * Renderizar estadísticas de elementos checkbox
         */
        renderCheckboxElementStats(element) {
            const chartId = `checkbox-chart-${element.id}`;
            
            return `
                <div class="sfq-element-stats-grid">
                    <div class="sfq-stat-card">
                        <div class="sfq-stat-value">${element.total_responses}</div>
                        <div class="sfq-stat-label">Total Respuestas</div>
                    </div>
                    <div class="sfq-stat-card">
                        <div class="sfq-stat-value">${element.checked_count || 0}</div>
                        <div class="sfq-stat-label">Marcados</div>
                    </div>
                    <div class="sfq-stat-card">
                        <div class="sfq-stat-value">${element.checked_percentage || 0}%</div>
                        <div class="sfq-stat-label">Tasa Aceptación</div>
                    </div>
                </div>
                
                <div class="sfq-checkbox-visual">
                    <div class="sfq-checkbox-item ${element.checked_percentage > 50 ? 'majority' : ''}">
                        <span class="sfq-checkbox-icon">☑️</span>
                        <span class="sfq-checkbox-label">Marcado</span>
                        <span class="sfq-checkbox-count">${element.checked_count} (${element.checked_percentage}%)</span>
                    </div>
                    <div class="sfq-checkbox-item ${element.unchecked_percentage > 50 ? 'majority' : ''}">
                        <span class="sfq-checkbox-icon">☐</span>
                        <span class="sfq-checkbox-label">No marcado</span>
                        <span class="sfq-checkbox-count">${element.unchecked_count} (${element.unchecked_percentage}%)</span>
                    </div>
                </div>
                
                <div class="sfq-chart-container">
                    <canvas id="${chartId}" width="300" height="200"></canvas>
                </div>
            `;
        }

        /**
         * Renderizar estadísticas de elementos de interacción
         */
        renderInteractionElementStats(element) {
            const actionText = element.action_type === 'clicks' ? 'clicks' : 'interacciones';
            
            return `
                <div class="sfq-element-stats-grid">
                    <div class="sfq-stat-card">
                        <div class="sfq-stat-value">${element.total_responses}</div>
                        <div class="sfq-stat-label">Vistas Únicas</div>
                    </div>
                    <div class="sfq-stat-card">
                        <div class="sfq-stat-value">${element.interaction_count || 0}</div>
                        <div class="sfq-stat-label">Total ${actionText}</div>
                    </div>
                    <div class="sfq-stat-card">
                        <div class="sfq-stat-value">${element.interaction_rate || 0}%</div>
                        <div class="sfq-stat-label">Tasa de ${actionText}</div>
                    </div>
                </div>
                
                <div class="sfq-interaction-visual">
                    <div class="sfq-interaction-bar">
                        <div class="sfq-interaction-fill" style="width: ${element.interaction_rate || 0}%"></div>
                        <span class="sfq-interaction-text">${element.interaction_rate || 0}% de usuarios interactuaron</span>
                    </div>
                </div>
            `;
        }

        /**
         * Renderizar estadísticas de elementos de archivo
         */
        renderFileElementStats(element) {
            let html = `
                <div class="sfq-element-stats-grid">
                    <div class="sfq-stat-card">
                        <div class="sfq-stat-value">${element.total_responses}</div>
                        <div class="sfq-stat-label">Total Respuestas</div>
                    </div>
                    <div class="sfq-stat-card">
                        <div class="sfq-stat-value">${element.files_uploaded || 0}</div>
                        <div class="sfq-stat-label">Archivos Subidos</div>
                    </div>
                    <div class="sfq-stat-card">
                        <div class="sfq-stat-value">${element.upload_rate || 0}%</div>
                        <div class="sfq-stat-label">Tasa de Subida</div>
                    </div>
                </div>
            `;

            // Mostrar tipos de archivo
            if (element.file_types && Object.keys(element.file_types).length > 0) {
                html += `
                    <div class="sfq-file-types">
                        <h5>Tipos de Archivo</h5>
                        <div class="sfq-file-types-list">
                `;
                
                Object.entries(element.file_types).forEach(([extension, count]) => {
                    const percentage = element.total_files > 0 ? 
                        Math.round((count / element.total_files) * 100) : 0;
                    html += `
                        <div class="sfq-file-type-item">
                            <span class="sfq-file-extension">.${extension}</span>
                            <span class="sfq-file-count">${count} archivos (${percentage}%)</span>
                        </div>
                    `;
                });
                
                html += `
                        </div>
                    </div>
                `;
            }

            return html;
        }

        /**
         * Renderizar estadísticas de elementos legales
         */
        renderLegalElementStats(element) {
            const chartId = `legal-chart-${element.id}`;
            
            return `
                <div class="sfq-element-stats-grid">
                    <div class="sfq-stat-card">
                        <div class="sfq-stat-value">${element.total_responses}</div>
                        <div class="sfq-stat-label">Total Respuestas</div>
                    </div>
                    <div class="sfq-stat-card">
                        <div class="sfq-stat-value">${element.accepted_count || 0}</div>
                        <div class="sfq-stat-label">Aceptaron</div>
                    </div>
                    <div class="sfq-stat-card">
                        <div class="sfq-stat-value">${element.acceptance_rate || 0}%</div>
                        <div class="sfq-stat-label">Tasa Aceptación</div>
                    </div>
                </div>
                
                <div class="sfq-legal-visual">
                    <div class="sfq-legal-item accepted">
                        <span class="sfq-legal-icon">✅</span>
                        <span class="sfq-legal-label">Aceptaron</span>
                        <span class="sfq-legal-count">${element.accepted_count} (${element.acceptance_rate}%)</span>
                    </div>
                    <div class="sfq-legal-item rejected">
                        <span class="sfq-legal-icon">❌</span>
                        <span class="sfq-legal-label">Rechazaron</span>
                        <span class="sfq-legal-count">${element.rejected_count} (${100 - (element.acceptance_rate || 0)}%)</span>
                    </div>
                </div>
                
                <div class="sfq-chart-container">
                    <canvas id="${chartId}" width="300" height="200"></canvas>
                </div>
            `;
        }

        /**
         * Renderizar estadísticas genéricas
         */
        renderGenericElementStats(element) {
            return `
                <div class="sfq-element-stats-grid">
                    <div class="sfq-stat-card">
                        <div class="sfq-stat-value">${element.total_responses}</div>
                        <div class="sfq-stat-label">Total Respuestas</div>
                    </div>
                </div>
                
                <div class="sfq-generic-note">
                    <p>${element.note || 'Estadísticas no disponibles para este tipo de elemento.'}</p>
                </div>
            `;
        }

        /**
         * Obtener icono para tipo de elemento
         */
        getElementIcon(type) {
            const icons = {
                'text': '📝',
                'email': '📧',
                'phone': '📞',
                'rating': '⭐',
                'dropdown': '📊',
                'checkbox': '☑️',
                'button': '🔘',
                'image': '🖼️',
                'video': '🎬',
                'file_upload': '📁',
                'countdown': '⏰',
                'legal_text': '📋'
            };
            return icons[type] || '❓';
        }

        /**
         * Obtener nombre legible del tipo de elemento
         */
        getElementTypeName(type) {
            const names = {
                'text': 'Texto',
                'email': 'Email',
                'phone': 'Teléfono',
                'rating': 'Valoración',
                'dropdown': 'Desplegable',
                'checkbox': 'Checkbox',
                'button': 'Botón',
                'image': 'Imagen',
                'video': 'Video',
                'file_upload': 'Subir Archivo',
                'countdown': 'Cuenta Atrás',
                'legal_text': 'Texto Legal'
            };
            return names[type] || 'Desconocido';
        }

        /**
         * Crear gráfico para elemento rating
         */
        createRatingChart(element, canvasId) {
            const canvas = document.getElementById(canvasId);
            if (!canvas || !element.distribution) return;

            const ctx = canvas.getContext('2d');
            const labels = element.distribution.map(item => item.label);
            const data = element.distribution.map(item => item.count);
            const colors = this.generateColors(data.length);

            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: colors,
                        borderWidth: 1,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }

        /**
         * Crear gráfico para elemento dropdown
         */
        createDropdownChart(element, canvasId) {
            const canvas = document.getElementById(canvasId);
            if (!canvas || !element.distribution) return;

            const ctx = canvas.getContext('2d');
            const labels = element.distribution.map(item => 
                item.option.length > 15 ? item.option.substring(0, 15) + '...' : item.option
            );
            const data = element.distribution.map(item => item.count);
            const colors = this.generateColors(data.length);

            new Chart(ctx, {
                type: 'doughnut',
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
                            labels: { padding: 10, font: { size: 11 } }
                        }
                    }
                }
            });
        }

        /**
         * ✅ NUEVO: Cargar analytics de abandono
         */
        async loadAbandonmentAnalytics() {
            const period = $('#sfq-stats-period').val();
            
            // Show loading state
            $('#partial-responses-count').text('-');
            $('#abandonment-rate').text('-');
            $('#top-exit-question').text('-');
            $('#top-abandonment-country').text('-');
            
            try {
                const response = await $.ajax({
                    url: sfq_ajax.ajax_url,
                    type: 'POST',
                    data: {
                        action: 'sfq_get_abandonment_analytics',
                        nonce: sfq_ajax.nonce,
                        form_id: this.formId,
                        period: period
                    }
                });

                if (response.success) {
                    this.updateAbandonmentDisplay(response.data);
                } else {
                    this.showAbandonmentError(response.data);
                }
            } catch (error) {
                this.showAbandonmentError('Error de conexión');
            }
        }

        /**
         * ✅ NUEVO: Actualizar display de analytics de abandono
         */
        updateAbandonmentDisplay(data) {
            // Update summary cards
            $('#partial-responses-count').text(data.summary.partial_responses_count);
            $('#abandonment-rate').text(data.summary.abandonment_rate);
            $('#top-exit-question').text(data.summary.top_exit_question);
            $('#top-abandonment-country').text(data.summary.top_abandonment_country);
            
            // Create charts
            this.createAbandonmentQuestionsChart(data.questions_chart);
            this.createAbandonmentCountriesChart(data.countries_chart);
            this.createAbandonmentTimelineChart(data.timeline_chart);
            
            // Load partial responses table
            this.loadPartialResponsesTable();
        }

        /**
         * ✅ NUEVO: Crear gráfico de abandono por preguntas
         */
        createAbandonmentQuestionsChart(questionsData) {
            const canvas = document.getElementById('sfq-abandonment-questions-chart');
            if (!canvas || !questionsData || questionsData.length === 0) {
                if (canvas) {
                    canvas.parentElement.innerHTML = '<p style="text-align: center; color: #646970;">No hay datos de abandono por pregunta</p>';
                }
                return;
            }
            
            const ctx = canvas.getContext('2d');
            
            // Destroy existing chart if exists
            if (this.charts.abandonmentQuestions) {
                this.charts.abandonmentQuestions.destroy();
            }
            
            // Take top 10 questions with most abandonment
            const topQuestions = questionsData.slice(0, 10);
            
            this.charts.abandonmentQuestions = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: topQuestions.map(q => 
                        q.question_text.length > 30 ? 
                        q.question_text.substring(0, 30) + '...' : 
                        q.question_text
                    ),
                    datasets: [{
                        label: 'Abandonos',
                        data: topQuestions.map(q => q.count),
                        backgroundColor: '#dc3232',
                        borderColor: '#a00',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { stepSize: 1 }
                        },
                        x: {
                            ticks: { maxRotation: 45 }
                        }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = context.parsed.y;
                                    const percentage = topQuestions[context.dataIndex].percentage;
                                    return `Abandonos: ${value} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }

        /**
         * ✅ NUEVO: Crear gráfico de abandono por países
         */
        createAbandonmentCountriesChart(countriesData) {
            const canvas = document.getElementById('sfq-abandonment-countries-chart');
            if (!canvas || !countriesData || countriesData.length === 0) {
                if (canvas) {
                    canvas.parentElement.innerHTML = '<p style="text-align: center; color: #646970;">No hay datos de abandono por país</p>';
                }
                return;
            }
            
            const ctx = canvas.getContext('2d');
            
            // Destroy existing chart if exists
            if (this.charts.abandonmentCountries) {
                this.charts.abandonmentCountries.destroy();
            }
            
            // Take top 8 countries
            const topCountries = countriesData.slice(0, 8);
            
            this.charts.abandonmentCountries = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: topCountries.map(c => c.flag_emoji + ' ' + c.country_name),
                    datasets: [{
                        data: topCountries.map(c => c.count),
                        backgroundColor: [
                            '#dc3232', '#ff6b6b', '#ff8e8e', '#ffb1b1',
                            '#ffd4d4', '#ffe7e7', '#fff0f0', '#fff8f8'
                        ],
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
                            labels: { padding: 10, font: { size: 11 } }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = context.parsed;
                                    const percentage = topCountries[context.dataIndex].percentage;
                                    return `${context.label}: ${value} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }

        /**
         * ✅ NUEVO: Crear gráfico temporal de abandono
         */
        createAbandonmentTimelineChart(timelineData) {
            const canvas = document.getElementById('sfq-abandonment-timeline-chart');
            if (!canvas || !timelineData || timelineData.length === 0) {
                if (canvas) {
                    canvas.parentElement.innerHTML = '<p style="text-align: center; color: #646970;">No hay datos de timeline de abandono</p>';
                }
                return;
            }
            
            const ctx = canvas.getContext('2d');
            
            // Destroy existing chart if exists
            if (this.charts.abandonmentTimeline) {
                this.charts.abandonmentTimeline.destroy();
            }
            
            const labels = timelineData.map(item => {
                const date = new Date(item.date);
                return date.toLocaleDateString('es-ES', { 
                    month: 'short', 
                    day: 'numeric' 
                });
            });
            const data = timelineData.map(item => parseInt(item.count) || 0);
            
            this.charts.abandonmentTimeline = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Abandonos por día',
                        data: data,
                        borderColor: '#dc3232',
                        backgroundColor: 'rgba(220, 50, 50, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#dc3232',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { stepSize: 1 }
                        },
                        x: {
                            ticks: { maxRotation: 45 }
                        }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `Abandonos: ${context.parsed.y}`;
                                }
                            }
                        }
                    }
                }
            });
        }

        /**
         * ✅ NUEVO: Cargar tabla de respuestas parciales
         */
        async loadPartialResponsesTable(page = 1) {
            const countryFilter = $('#sfq-abandonment-filter-country').val();
            const questionFilter = $('#sfq-abandonment-filter-question').val();
            
            try {
                const response = await $.ajax({
                    url: sfq_ajax.ajax_url,
                    type: 'POST',
                    data: {
                        action: 'sfq_get_partial_responses_list',
                        nonce: sfq_ajax.nonce,
                        form_id: this.formId,
                        page: page,
                        per_page: 20,
                        country_filter: countryFilter,
                        question_filter: questionFilter
                    }
                });

                if (response.success) {
                    this.displayPartialResponsesTable(response.data);
                } else {
                }
            } catch (error) {
            }
        }

        /**
         * ✅ NUEVO: Mostrar tabla de respuestas parciales
         */
        displayPartialResponsesTable(data) {
            const tbody = $('#sfq-abandonment-tbody');
            
            if (!data.data || data.data.length === 0) {
                tbody.html('<tr><td colspan="7" style="text-align: center; color: #646970;">No hay respuestas parciales disponibles</td></tr>');
                return;
            }
            
            const html = data.data.map(item => `
                <tr>
                    <td>${this.escapeHtml(item.session_id)}</td>
                    <td>${item.country}</td>
                    <td>${item.last_question}</td>
                    <td>
                        <div class="sfq-progress-bar">
                            <div class="sfq-progress-fill" style="width: ${item.progress}"></div>
                            <span class="sfq-progress-text">${item.progress}</span>
                        </div>
                    </td>
                    <td>${item.time_elapsed}</td>
                    <td>${item.last_activity}</td>
                    <td>
                        <span class="sfq-status sfq-status-${item.status}">
                            ${item.status === 'expired' ? 'Expirado' : 'Activo'}
                        </span>
                    </td>
                </tr>
            `).join('');
            
            tbody.html(html);
            
            // Update pagination
            this.updateAbandonmentPagination(data.current_page, data.pages);
        }

        /**
         * ✅ NUEVO: Actualizar paginación de abandono
         */
        updateAbandonmentPagination(currentPage, totalPages) {
            const container = $('#sfq-abandonment-pagination');
            
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
                this.loadPartialResponsesTable(page);
            });
        }

        /**
         * ✅ NUEVO: Mostrar error de abandono
         */
        showAbandonmentError(error) {
            $('#partial-responses-count').text('Error');
            $('#abandonment-rate').text('Error');
            $('#top-exit-question').text('Error');
            $('#top-abandonment-country').text('Error');
            
            // Show error in charts
            const chartContainers = [
                '#sfq-abandonment-questions-chart',
                '#sfq-abandonment-countries-chart', 
                '#sfq-abandonment-timeline-chart'
            ];
            
            chartContainers.forEach(selector => {
                const canvas = document.querySelector(selector);
                if (canvas) {
                    canvas.parentElement.innerHTML = `<p style="text-align: center; color: #dc3232;">Error al cargar datos: ${error}</p>`;
                }
            });
        }

        /**
         * Initialize when DOM is ready
         */
        bindFreestyleEvents() {
            // Toggle individual elements
            $(document).off('click', '.sfq-element-header').on('click', '.sfq-element-header', (e) => {
                e.preventDefault();
                const header = $(e.currentTarget);
                const targetId = header.data('toggle');
                const content = $(`#${targetId}`);
                const toggleIcon = header.find('.sfq-element-toggle .dashicons');
                
                if (content.is(':visible')) {
                    content.slideUp(200);
                    toggleIcon.removeClass('dashicons-arrow-up-alt2').addClass('dashicons-arrow-down-alt2');
                } else {
                    content.slideDown(200);
                    toggleIcon.removeClass('dashicons-arrow-down-alt2').addClass('dashicons-arrow-up-alt2');
                }
            });

            // Expand/collapse all elements in a freestyle question
            $(document).off('click', '.sfq-expand-all-elements').on('click', '.sfq-expand-all-elements', (e) => {
                e.preventDefault();
                const button = $(e.currentTarget);
                const questionIndex = button.data('question');
                const questionCard = button.closest('.sfq-freestyle-question-card');
                const allContents = questionCard.find('.sfq-element-content');
                const allToggleIcons = questionCard.find('.sfq-element-toggle .dashicons');
                const buttonIcon = button.find('.dashicons');
                const buttonText = button.find('.sfq-expand-text');
                
                // Check if any are visible
                const anyVisible = allContents.filter(':visible').length > 0;
                
                if (anyVisible) {
                    // Collapse all
                    allContents.slideUp(200);
                    allToggleIcons.removeClass('dashicons-arrow-up-alt2').addClass('dashicons-arrow-down-alt2');
                    buttonIcon.removeClass('dashicons-arrow-up-alt2').addClass('dashicons-arrow-down-alt2');
                    buttonText.text('Expandir Todo');
                } else {
                    // Expand all
                    allContents.slideDown(200);
                    allToggleIcons.removeClass('dashicons-arrow-down-alt2').addClass('dashicons-arrow-up-alt2');
                    buttonIcon.removeClass('dashicons-arrow-down-alt2').addClass('dashicons-arrow-up-alt2');
                    buttonText.text('Colapsar Todo');
                }
            });

            // Expand/collapse all countries in a freestyle question
            $(document).off('click', '.sfq-expand-all-countries-freestyle').on('click', '.sfq-expand-all-countries-freestyle', (e) => {
                e.preventDefault();
                const button = $(e.currentTarget);
                const questionIndex = button.data('question');
                const questionCard = button.closest('.sfq-freestyle-question-card');
                const allCountriesBreakdowns = questionCard.find('.sfq-countries-breakdown');
                const allCountriesToggleButtons = questionCard.find('.sfq-countries-toggle');
                const buttonIcon = button.find('.dashicons');
                const buttonText = button.find('.sfq-expand-countries-text');
                
                // Check if any countries breakdown is visible
                const anyCountriesVisible = allCountriesBreakdowns.filter(':visible').length > 0;
                
                if (anyCountriesVisible) {
                    // Collapse all countries
                    allCountriesBreakdowns.slideUp(200);
                    allCountriesToggleButtons.each(function() {
                        const icon = $(this).find('.dashicons');
                        icon.removeClass('dashicons-dismiss').addClass('dashicons-admin-site-alt3');
                        $(this).attr('title', 'Ver desglose por países');
                    });
                    buttonIcon.removeClass('dashicons-dismiss').addClass('dashicons-admin-site-alt3');
                    buttonText.text('Mostrar países');
                    button.attr('title', 'Expandir todos los países');
                } else {
                    // Expand all countries
                    allCountriesBreakdowns.slideDown(200);
                    allCountriesToggleButtons.each(function() {
                        const icon = $(this).find('.dashicons');
                        icon.removeClass('dashicons-admin-site-alt3').addClass('dashicons-dismiss');
                        $(this).attr('title', 'Ocultar desglose por países');
                    });
                    buttonIcon.removeClass('dashicons-admin-site-alt3').addClass('dashicons-dismiss');
                    buttonText.text('Ocultar países');
                    button.attr('title', 'Colapsar todos los países');
                }
            });

            // Expand/collapse all countries in freestyle text elements
            $(document).off('click', '.sfq-expand-all-countries-text').on('click', '.sfq-expand-all-countries-text', (e) => {
                e.preventDefault();
                const button = $(e.currentTarget);
                const elementId = button.data('element');
                const elementContainer = button.closest('.sfq-element-content');
                const allCountriesBreakdowns = elementContainer.find('.sfq-countries-breakdown');
                const allCountriesToggleButtons = elementContainer.find('.sfq-countries-toggle');
                const buttonIcon = button.find('.dashicons');
                const buttonText = button.find('.sfq-expand-countries-text');
                
                // Check if any countries breakdown is visible
                const anyCountriesVisible = allCountriesBreakdowns.filter(':visible').length > 0;
                
                if (anyCountriesVisible) {
                    // Collapse all countries
                    allCountriesBreakdowns.slideUp(200);
                    allCountriesToggleButtons.each(function() {
                        const icon = $(this).find('.dashicons');
                        icon.removeClass('dashicons-dismiss').addClass('dashicons-admin-site-alt3');
                        $(this).attr('title', 'Ver desglose por países');
                    });
                    buttonIcon.removeClass('dashicons-dismiss').addClass('dashicons-admin-site-alt3');
                    buttonText.text('Mostrar países');
                    button.attr('title', 'Expandir todos los países');
                } else {
                    // Expand all countries
                    allCountriesBreakdowns.slideDown(200);
                    allCountriesToggleButtons.each(function() {
                        const icon = $(this).find('.dashicons');
                        icon.removeClass('dashicons-admin-site-alt3').addClass('dashicons-dismiss');
                        $(this).attr('title', 'Ocultar desglose por países');
                    });
                    buttonIcon.removeClass('dashicons-admin-site-alt3').addClass('dashicons-dismiss');
                    buttonText.text('Ocultar países');
                    button.attr('title', 'Colapsar todos los países');
                }
            });
        }

        /**
         * ✅ NUEVO: Cargar analytics de visitantes y clics
         */
        async loadVisitorsAnalytics() {
            const period = $('#sfq-visitors-timeline-period').val() || '30';
            
            // Show loading state
            $('#unique-visitors').text('-');
            $('#total-visits').text('-');
            $('#unique-clicks').text('-');
            $('#total-clicks').text('-');
            $('#top-country-unique-clicks .sfq-country-name').text('-');
            $('#top-country-unique-clicks .sfq-country-count').text('(-)');
            $('#global-conversion-rate .sfq-conversion-percentage').text('-%');
            $('#avg-clicks-per-visitor .sfq-avg-number').text('-');
            
            // Show loading in table
            $('#sfq-visitors-countries-tbody').html(`
                <tr>
                    <td colspan="7" class="sfq-loading-cell">
                        <div class="sfq-loading-spinner"></div>
                        Cargando datos de visitantes...
                    </td>
                </tr>
            `);
            
            try {
                const response = await $.ajax({
                    url: sfq_ajax.ajax_url,
                    type: 'POST',
                    data: {
                        action: 'sfq_get_visitors_analytics',
                        nonce: sfq_ajax.nonce,
                        form_id: this.formId,
                        period: period
                    }
                });

                if (response.success) {
                    this.updateVisitorsDisplay(response.data);
                } else {
                    this.showVisitorsError(response.data);
                }
            } catch (error) {
                this.showVisitorsError('Error de conexión');
            }
        }

        /**
         * ✅ NUEVO: Actualizar display de analytics de visitantes
         */
        updateVisitorsDisplay(data) {
            // Update summary cards
            $('#unique-visitors').text(data.summary.unique_visitors.toLocaleString());
            $('#total-visits').text(data.summary.total_visits.toLocaleString());
            $('#unique-clicks').text(data.summary.unique_clicks.toLocaleString());
            $('#total-clicks').text(data.summary.total_clicks.toLocaleString());
            
            // Update top country with unique clicks
            const topCountry = data.summary.top_country_unique_clicks;
            $('#top-country-unique-clicks .sfq-country-flag').text(topCountry.flag_emoji);
            $('#top-country-unique-clicks .sfq-country-name').text(topCountry.country_name);
            $('#top-country-unique-clicks .sfq-country-count').text(`(${topCountry.count})`);
            
            // Update conversion rate
            $('#global-conversion-rate .sfq-conversion-percentage').text(data.summary.conversion_rate + '%');
            
            // Update average clicks per visitor
            $('#avg-clicks-per-visitor .sfq-avg-number').text(data.summary.avg_clicks_per_visitor);
            
            // Create charts
            this.createVisitorsTimelineChart(data.timeline_chart);
            this.createVisitorsCountriesChart(data.countries_chart);
            
            // Update countries table
            this.updateVisitorsCountriesTable(data.countries_table);
            
            // Update button stats
            this.updateButtonStats(data.button_stats);
            
            // Bind events for visitors tab
            this.bindVisitorsEvents();
        }

        /**
         * ✅ NUEVO: Crear gráfico temporal de visitantes
         */
        createVisitorsTimelineChart(timelineData) {
            const canvas = document.getElementById('sfq-visitors-timeline-chart');
            if (!canvas || !timelineData || timelineData.length === 0) {
                if (canvas) {
                    canvas.parentElement.innerHTML = '<p style="text-align: center; color: #646970;">No hay datos de timeline de visitantes</p>';
                }
                return;
            }
            
            const ctx = canvas.getContext('2d');
            
            // Destroy existing chart if exists
            if (this.charts.visitorsTimeline) {
                this.charts.visitorsTimeline.destroy();
            }
            
            const labels = timelineData.map(item => {
                const date = new Date(item.date);
                return date.toLocaleDateString('es-ES', { 
                    month: 'short', 
                    day: 'numeric' 
                });
            });
            
            this.charts.visitorsTimeline = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Visitantes Únicos',
                            data: timelineData.map(item => parseInt(item.unique_visitors) || 0),
                            borderColor: '#007cba',
                            backgroundColor: 'rgba(0, 124, 186, 0.1)',
                            borderWidth: 2,
                            fill: false,
                            tension: 0.4,
                            pointBackgroundColor: '#007cba',
                            pointBorderColor: '#fff',
                            pointBorderWidth: 2,
                            pointRadius: 4
                        },
                        {
                            label: 'Clics Únicos',
                            data: timelineData.map(item => parseInt(item.unique_clicks) || 0),
                            borderColor: '#46b450',
                            backgroundColor: 'rgba(70, 180, 80, 0.1)',
                            borderWidth: 2,
                            fill: false,
                            tension: 0.4,
                            pointBackgroundColor: '#46b450',
                            pointBorderColor: '#fff',
                            pointBorderWidth: 2,
                            pointRadius: 4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { stepSize: 1 }
                        },
                        x: {
                            ticks: { maxRotation: 45 }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: { padding: 20 }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `${context.dataset.label}: ${context.parsed.y}`;
                                }
                            }
                        }
                    }
                }
            });
        }

        /**
         * ✅ NUEVO: Crear gráfico de países con más clics únicos
         */
        createVisitorsCountriesChart(countriesData) {
            const canvas = document.getElementById('sfq-visitors-countries-chart');
            if (!canvas || !countriesData || countriesData.length === 0) {
                if (canvas) {
                    canvas.parentElement.innerHTML = '<p style="text-align: center; color: #646970;">No hay datos de países</p>';
                }
                return;
            }
            
            const ctx = canvas.getContext('2d');
            
            // Destroy existing chart if exists
            if (this.charts.visitorsCountries) {
                this.charts.visitorsCountries.destroy();
            }
            
            // Take top 8 countries for better visualization
            const topCountries = countriesData.slice(0, 8);
            
            this.charts.visitorsCountries = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: topCountries.map(c => c.flag_emoji + ' ' + c.country_name),
                    datasets: [{
                        label: 'Clics Únicos',
                        data: topCountries.map(c => c.unique_clicks),
                        backgroundColor: [
                            '#007cba', '#46b450', '#f56e28', '#e74c3c',
                            '#9b59b6', '#f39c12', '#1abc9c', '#34495e'
                        ],
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
                                font: { size: 11 },
                                generateLabels: function(chart) {
                                    const data = chart.data;
                                    if (data.labels.length && data.datasets.length) {
                                        return data.labels.map((label, i) => {
                                            const value = data.datasets[0].data[i];
                                            return {
                                                text: `${label}: ${value}`,
                                                fillStyle: data.datasets[0].backgroundColor[i],
                                                strokeStyle: data.datasets[0].borderColor,
                                                lineWidth: data.datasets[0].borderWidth,
                                                hidden: false,
                                                index: i
                                            };
                                        });
                                    }
                                    return [];
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = context.parsed;
                                    const percentage = topCountries[context.dataIndex].percentage || 0;
                                    return `${context.label}: ${value} clics únicos (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }

        /**
         * ✅ NUEVO: Actualizar tabla de países con estadísticas detalladas
         */
        updateVisitorsCountriesTable(countriesData) {
            const tbody = $('#sfq-visitors-countries-tbody');
            
            if (!countriesData || countriesData.length === 0) {
                tbody.html('<tr><td colspan="7" style="text-align: center; color: #646970;">No hay datos de países disponibles</td></tr>');
                return;
            }
            
            const html = countriesData.map(country => `
                <tr>
                    <td>
                        <span class="sfq-country-flag">${country.flag_emoji}</span>
                        <span class="sfq-country-name">${this.escapeHtml(country.country_name)}</span>
                    </td>
                    <td>${country.unique_visitors.toLocaleString()}</td>
                    <td>${country.total_visits.toLocaleString()}</td>
                    <td><strong>${country.unique_clicks.toLocaleString()}</strong></td>
                    <td>${country.total_clicks.toLocaleString()}</td>
                    <td>
                        <span class="sfq-conversion-rate ${country.conversion_rate >= 50 ? 'high' : country.conversion_rate >= 25 ? 'medium' : 'low'}">
                            ${country.conversion_rate}%
                        </span>
                    </td>
                    <td>${country.percentage}%</td>
                </tr>
            `).join('');
            
            tbody.html(html);
        }

        /**
         * ✅ NUEVO: Bind events específicos para la pestaña de visitantes
         */
        bindVisitorsEvents() {
            // Period selector for visitors timeline
            $('#sfq-visitors-timeline-period').off('change').on('change', (e) => {
                this.loadVisitorsAnalytics();
            });

            // Refresh visitors data
            $('#sfq-refresh-visitors-data').off('click').on('click', (e) => {
                e.preventDefault();
                this.loadVisitorsAnalytics();
            });

            // Export visitors data
            $('#sfq-export-visitors-data').off('click').on('click', (e) => {
                e.preventDefault();
                this.exportVisitorsData();
            });
        }

        /**
         * ✅ NUEVO: Exportar datos de visitantes
         */
        async exportVisitorsData() {
            const period = $('#sfq-visitors-timeline-period').val() || '30';
            
            try {
                const response = await $.ajax({
                    url: sfq_ajax.ajax_url,
                    type: 'POST',
                    data: {
                        action: 'sfq_export_visitors_data',
                        nonce: sfq_ajax.nonce,
                        form_id: this.formId,
                        period: period
                    }
                });

                if (response.success) {
                    // Download the file
                    window.location.href = response.data.file_url;
                    this.showNotice('Datos de visitantes exportados correctamente', 'success');
                } else {
                    this.showNotice('Error al exportar datos de visitantes: ' + (response.data || 'Error desconocido'), 'error');
                }
            } catch (error) {
                this.showNotice('Error al exportar datos de visitantes', 'error');
            }
        }

        /**
         * ✅ NUEVO: Mostrar error en pestaña de visitantes
         */
        showVisitorsError(error) {
            $('#unique-visitors').text('Error');
            $('#total-visits').text('Error');
            $('#unique-clicks').text('Error');
            $('#total-clicks').text('Error');
            $('#top-country-unique-clicks .sfq-country-name').text('Error');
            $('#top-country-unique-clicks .sfq-country-count').text('(-)');
            $('#global-conversion-rate .sfq-conversion-percentage').text('Error');
            $('#avg-clicks-per-visitor .sfq-avg-number').text('Error');
            
            // Show error in charts
            const chartContainers = [
                '#sfq-visitors-timeline-chart',
                '#sfq-visitors-countries-chart'
            ];
            
            chartContainers.forEach(selector => {
                const canvas = document.querySelector(selector);
                if (canvas) {
                    canvas.parentElement.innerHTML = `<p style="text-align: center; color: #dc3232;">Error al cargar datos: ${error}</p>`;
                }
            });
            
            // Show error in table
            $('#sfq-visitors-countries-tbody').html(`
                <tr>
                    <td colspan="7" style="text-align: center; color: #dc3232;">
                        Error al cargar datos de visitantes: ${error}
                    </td>
                </tr>
            `);
        }

        /**
         * ✅ NUEVO: Actualizar estadísticas de botones y URLs
         */
        updateButtonStats(buttonStats) {
            const container = $('#sfq-button-stats-content');
            
            if (!buttonStats || (buttonStats.button_clicks.length === 0 && buttonStats.url_clicks.length === 0)) {
                container.html(`
                    <div class="sfq-no-data">
                        <span class="dashicons dashicons-info"></span>
                        <p>No hay datos de clics en botones disponibles</p>
                        <p style="font-size: 12px; color: #666; margin-top: 10px;">
                            Los clics en botones con URLs se mostrarán aquí cuando estén disponibles.
                        </p>
                    </div>
                `);
                return;
            }
            
            let html = '';
            
            // Mostrar estadísticas por botón individual
            if (buttonStats.button_clicks.length > 0) {
                html += `
                    <div class="sfq-button-clicks-section">
                        <h4>Clics por Botón Individual</h4>
                        <div class="sfq-button-clicks-grid">
                `;
                
                buttonStats.button_clicks.forEach((button, index) => {
                    html += `
                        <div class="sfq-button-click-card">
                            <div class="sfq-button-click-header">
                                <h5>${this.escapeHtml(button.button_text)}</h5>
                                <a href="${this.escapeHtml(button.button_url)}" target="_blank" class="sfq-button-url">
                                    ${this.escapeHtml(button.button_url)}
                                    <span class="dashicons dashicons-external"></span>
                                </a>
                            </div>
                            <div class="sfq-button-click-stats">
                                <div class="sfq-stat-item">
                                    <span class="sfq-stat-value">${button.click_count}</span>
                                    <span class="sfq-stat-label">Total Clics</span>
                                </div>
                                <div class="sfq-stat-item">
                                    <span class="sfq-stat-value">${button.unique_clicks}</span>
                                    <span class="sfq-stat-label">Clics Únicos</span>
                                </div>
                                <div class="sfq-stat-item">
                                    <span class="sfq-stat-value">${button.unique_users}</span>
                                    <span class="sfq-stat-label">Usuarios Únicos</span>
                                </div>
                            </div>
                            ${button.countries_data && button.countries_data.length > 0 ? `
                                <div class="sfq-button-countries">
                                    <h6>Top Países</h6>
                                    <div class="sfq-button-countries-list">
                                        ${button.countries_data.map(country => `
                                            <div class="sfq-button-country-item">
                                                <span class="sfq-country-flag">${country.flag_emoji}</span>
                                                <span class="sfq-country-name">${this.escapeHtml(country.country_name)}</span>
                                                <span class="sfq-country-clicks">${country.clicks} (${country.percentage}%)</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    `;
                });
                
                html += `
                        </div>
                    </div>
                `;
            }
            
            // Mostrar estadísticas por URL agrupada
            if (buttonStats.url_clicks.length > 0) {
                html += `
                    <div class="sfq-url-clicks-section">
                        <h4>Clics por URL (Agrupados)</h4>
                        <div class="sfq-url-clicks-grid">
                `;
                
                buttonStats.url_clicks.forEach((url, index) => {
                    html += `
                        <div class="sfq-url-click-card">
                            <div class="sfq-url-click-header">
                                <a href="${this.escapeHtml(url.button_url)}" target="_blank" class="sfq-url-link">
                                    ${this.escapeHtml(url.button_url)}
                                    <span class="dashicons dashicons-external"></span>
                                </a>
                                <div class="sfq-url-button-texts">
                                    <strong>Textos de botones:</strong>
                                    ${url.button_texts.map(text => `<span class="sfq-button-text-tag">${this.escapeHtml(text)}</span>`).join('')}
                                </div>
                            </div>
                            <div class="sfq-url-click-stats">
                                <div class="sfq-stat-item">
                                    <span class="sfq-stat-value">${url.click_count}</span>
                                    <span class="sfq-stat-label">Total Clics</span>
                                </div>
                                <div class="sfq-stat-item">
                                    <span class="sfq-stat-value">${url.unique_clicks}</span>
                                    <span class="sfq-stat-label">Clics Únicos</span>
                                </div>
                                <div class="sfq-stat-item">
                                    <span class="sfq-stat-value">${url.unique_users}</span>
                                    <span class="sfq-stat-label">Usuarios Únicos</span>
                                </div>
                            </div>
                            ${url.countries_data && url.countries_data.length > 0 ? `
                                <div class="sfq-url-countries">
                                    <h6>Top Países</h6>
                                    <div class="sfq-url-countries-list">
                                        ${url.countries_data.map(country => `
                                            <div class="sfq-url-country-item">
                                                <span class="sfq-country-flag">${country.flag_emoji}</span>
                                                <span class="sfq-country-name">${this.escapeHtml(country.country_name)}</span>
                                                <span class="sfq-country-clicks">${country.clicks} (${country.percentage}%)</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    `;
                });
                
                html += `
                        </div>
                    </div>
                `;
            }
            
            // Mostrar resumen general
            if (buttonStats.total_button_clicks > 0 || buttonStats.total_url_clicks > 0) {
                html += `
                    <div class="sfq-button-stats-summary">
                        <h4>Resumen de Clics en Botones</h4>
                        <div class="sfq-button-summary-grid">
                            <div class="sfq-summary-stat">
                                <span class="sfq-summary-value">${buttonStats.total_button_clicks}</span>
                                <span class="sfq-summary-label">Total Clics en Botones</span>
                            </div>
                            <div class="sfq-summary-stat">
                                <span class="sfq-summary-value">${buttonStats.button_clicks.length}</span>
                                <span class="sfq-summary-label">Botones Únicos</span>
                            </div>
                            <div class="sfq-summary-stat">
                                <span class="sfq-summary-value">${buttonStats.url_clicks.length}</span>
                                <span class="sfq-summary-label">URLs Únicas</span>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            container.html(html);
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
