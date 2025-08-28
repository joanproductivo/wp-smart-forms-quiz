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
                                ${this.renderOptions(question.options, index)}
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
                
                // Bind country toggle events
                this.bindCountryToggleEvents();
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
            
            // Set explicit canvas dimensions to prevent infinite stretching
            const container = canvas.parentElement;
            const containerWidth = container.offsetWidth || 800;
            const containerHeight = Math.min(400, Math.max(300, containerWidth * 0.5));
            
            canvas.style.width = containerWidth + 'px';
            canvas.style.height = containerHeight + 'px';
            canvas.width = containerWidth;
            canvas.height = containerHeight;
            
            const ctx = canvas.getContext('2d');
            
            // Destroy existing chart if exists
            if (this.charts.timeline) {
                this.charts.timeline.destroy();
                this.charts.timeline = null;
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
            
            // Create timeline chart with fixed dimensions
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
                        responsive: false, // Disable responsive to prevent infinite stretching
                        maintainAspectRatio: false,
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
                
                // Add resize handler to update chart when container size changes
                const resizeObserver = new ResizeObserver(() => {
                    if (this.charts.timeline) {
                        const newWidth = container.offsetWidth || 800;
                        const newHeight = Math.min(400, Math.max(300, newWidth * 0.5));
                        
                        canvas.style.width = newWidth + 'px';
                        canvas.style.height = newHeight + 'px';
                        canvas.width = newWidth;
                        canvas.height = newHeight;
                        
                        this.charts.timeline.resize();
                    }
                });
                
                resizeObserver.observe(container);
                
                // Store observer for cleanup
                this.charts.timelineResizeObserver = resizeObserver;
                
            } catch (error) {
                console.error('Error creating timeline chart:', error);
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
