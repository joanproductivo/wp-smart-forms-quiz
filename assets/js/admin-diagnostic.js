/**
 * Smart Forms & Quiz - Diagnostic JavaScript
 * Sistema de diagnóstico y debugging para el plugin
 */

jQuery(document).ready(function($) {
    'use strict';

    // Solo ejecutar en modo debug
    if (typeof sfq_ajax === 'undefined' || !window.console) {
        return;
    }

    class SFQDiagnostic {
        constructor() {
            this.isEnabled = true;
            this.logLevel = 'info'; // 'error', 'warn', 'info', 'debug'
            this.init();
        }

        init() {
            this.addDiagnosticPanel();
            this.monitorAjaxRequests();
            this.monitorFormBuilder();
            this.addKeyboardShortcuts();
            
            console.log('SFQ Diagnostic: System initialized');
        }

        addDiagnosticPanel() {
            if ($('.sfq-builder-wrap').length === 0) return;

            const diagnosticHtml = `
                <div id="sfq-diagnostic-panel" style="
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    width: 300px;
                    max-height: 400px;
                    background: #fff;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    z-index: 9999;
                    display: none;
                    font-size: 12px;
                ">
                    <div style="
                        background: #0073aa;
                        color: white;
                        padding: 8px 12px;
                        font-weight: bold;
                        border-radius: 4px 4px 0 0;
                        cursor: move;
                    ">
                        SFQ Diagnostic Panel
                        <button id="sfq-diagnostic-close" style="
                            float: right;
                            background: none;
                            border: none;
                            color: white;
                            cursor: pointer;
                            font-size: 16px;
                            line-height: 1;
                        ">&times;</button>
                    </div>
                    <div id="sfq-diagnostic-content" style="
                        padding: 10px;
                        max-height: 350px;
                        overflow-y: auto;
                    ">
                        <div id="sfq-diagnostic-stats"></div>
                        <div id="sfq-diagnostic-logs" style="
                            margin-top: 10px;
                            font-family: monospace;
                            font-size: 11px;
                            background: #f9f9f9;
                            padding: 8px;
                            border-radius: 3px;
                            max-height: 200px;
                            overflow-y: auto;
                        "></div>
                    </div>
                </div>
            `;

            $('body').append(diagnosticHtml);

            // Hacer el panel arrastrable
            $('#sfq-diagnostic-panel').draggable({
                handle: 'div:first'
            });

            // Cerrar panel
            $('#sfq-diagnostic-close').on('click', () => {
                $('#sfq-diagnostic-panel').hide();
            });

            this.updateStats();
        }

        addKeyboardShortcuts() {
            $(document).on('keydown', (e) => {
                // Ctrl+Shift+D para mostrar/ocultar panel de diagnóstico
                if (e.ctrlKey && e.shiftKey && e.keyCode === 68) {
                    e.preventDefault();
                    $('#sfq-diagnostic-panel').toggle();
                }

                // Ctrl+Shift+C para limpiar logs
                if (e.ctrlKey && e.shiftKey && e.keyCode === 67) {
                    e.preventDefault();
                    this.clearLogs();
                }

                // Ctrl+Shift+E para exportar diagnóstico
                if (e.ctrlKey && e.shiftKey && e.keyCode === 69) {
                    e.preventDefault();
                    this.exportDiagnostic();
                }
            });
        }

        monitorAjaxRequests() {
            const originalAjax = $.ajax;
            const self = this;

            $.ajax = function(options) {
                const startTime = Date.now();
                
                // Log request
                if (options.data && options.data.action && options.data.action.startsWith('sfq_')) {
                    self.log('info', `AJAX Request: ${options.data.action}`, {
                        url: options.url,
                        data: options.data
                    });
                }

                const originalSuccess = options.success;
                const originalError = options.error;

                options.success = function(data, textStatus, jqXHR) {
                    const duration = Date.now() - startTime;
                    
                    if (options.data && options.data.action && options.data.action.startsWith('sfq_')) {
                        self.log('info', `AJAX Success: ${options.data.action} (${duration}ms)`, {
                            response: data,
                            duration: duration
                        });
                    }

                    if (originalSuccess) {
                        originalSuccess.apply(this, arguments);
                    }
                };

                options.error = function(jqXHR, textStatus, errorThrown) {
                    const duration = Date.now() - startTime;
                    
                    if (options.data && options.data.action && options.data.action.startsWith('sfq_')) {
                        self.log('error', `AJAX Error: ${options.data.action} (${duration}ms)`, {
                            status: jqXHR.status,
                            statusText: jqXHR.statusText,
                            responseText: jqXHR.responseText,
                            duration: duration
                        });
                    }

                    if (originalError) {
                        originalError.apply(this, arguments);
                    }
                };

                return originalAjax.call(this, options);
            };
        }

        monitorFormBuilder() {
            // Monitor form builder events
            $(document).on('sfq:form:loaded', (e, data) => {
                this.log('info', 'Form loaded', data);
                this.updateStats();
            });

            $(document).on('sfq:question:added', (e, data) => {
                this.log('info', 'Question added', data);
                this.updateStats();
            });

            $(document).on('sfq:question:deleted', (e, data) => {
                this.log('info', 'Question deleted', data);
                this.updateStats();
            });

            $(document).on('sfq:form:saved', (e, data) => {
                this.log('info', 'Form saved', data);
                this.updateStats();
            });

            // Monitor errors
            window.addEventListener('error', (e) => {
                if (e.filename && e.filename.includes('admin.js')) {
                    this.log('error', 'JavaScript Error', {
                        message: e.message,
                        filename: e.filename,
                        lineno: e.lineno,
                        colno: e.colno
                    });
                }
            });
        }

        log(level, message, data = null) {
            if (!this.isEnabled) return;

            const timestamp = new Date().toLocaleTimeString();
            const logEntry = {
                timestamp: timestamp,
                level: level,
                message: message,
                data: data
            };

            // Console log
            const consoleMethod = console[level] || console.log;
            if (data) {
                consoleMethod(`[SFQ ${level.toUpperCase()}] ${message}`, data);
            } else {
                consoleMethod(`[SFQ ${level.toUpperCase()}] ${message}`);
            }

            // Add to diagnostic panel
            this.addLogToPanel(logEntry);
        }

        addLogToPanel(logEntry) {
            const $logsContainer = $('#sfq-diagnostic-logs');
            if ($logsContainer.length === 0) return;

            const levelColors = {
                error: '#dc3232',
                warn: '#ffb900',
                info: '#0073aa',
                debug: '#666'
            };

            const logHtml = `
                <div style="
                    margin-bottom: 4px;
                    padding: 2px 4px;
                    border-left: 3px solid ${levelColors[logEntry.level] || '#666'};
                    background: ${logEntry.level === 'error' ? '#ffeaea' : 'transparent'};
                ">
                    <span style="color: #666; font-size: 10px;">${logEntry.timestamp}</span>
                    <strong style="color: ${levelColors[logEntry.level]}; text-transform: uppercase;">
                        [${logEntry.level}]
                    </strong>
                    ${logEntry.message}
                    ${logEntry.data ? '<br><span style="color: #666; font-size: 10px;">Data logged to console</span>' : ''}
                </div>
            `;

            $logsContainer.append(logHtml);
            $logsContainer.scrollTop($logsContainer[0].scrollHeight);

            // Limit log entries
            const $logs = $logsContainer.children();
            if ($logs.length > 50) {
                $logs.first().remove();
            }
        }

        updateStats() {
            const $statsContainer = $('#sfq-diagnostic-stats');
            if ($statsContainer.length === 0) return;

            const formId = $('#sfq-form-id').val() || 'N/A';
            const questionsCount = $('#sfq-questions-container .sfq-question-item').length;
            const formTitle = $('#form-title').val() || 'Sin título';

            const statsHtml = `
                <div style="font-size: 11px; line-height: 1.4;">
                    <strong>Form ID:</strong> ${formId}<br>
                    <strong>Title:</strong> ${formTitle}<br>
                    <strong>Questions:</strong> ${questionsCount}<br>
                    <strong>Memory:</strong> ${this.getMemoryUsage()}<br>
                    <strong>Time:</strong> ${new Date().toLocaleTimeString()}
                </div>
            `;

            $statsContainer.html(statsHtml);
        }

        getMemoryUsage() {
            if (performance.memory) {
                const used = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
                const total = Math.round(performance.memory.totalJSHeapSize / 1024 / 1024);
                return `${used}MB / ${total}MB`;
            }
            return 'N/A';
        }

        clearLogs() {
            $('#sfq-diagnostic-logs').empty();
            this.log('info', 'Logs cleared');
        }

        exportDiagnostic() {
            const diagnosticData = {
                timestamp: new Date().toISOString(),
                formId: $('#sfq-form-id').val(),
                formTitle: $('#form-title').val(),
                questionsCount: $('#sfq-questions-container .sfq-question-item').length,
                userAgent: navigator.userAgent,
                url: window.location.href,
                memory: this.getMemoryUsage(),
                logs: $('#sfq-diagnostic-logs').text()
            };

            const dataStr = JSON.stringify(diagnosticData, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `sfq-diagnostic-${Date.now()}.json`;
            link.click();

            this.log('info', 'Diagnostic data exported');
        }

        // Public methods for external use
        static getInstance() {
            if (!window.sfqDiagnostic) {
                window.sfqDiagnostic = new SFQDiagnostic();
            }
            return window.sfqDiagnostic;
        }
    }

    // Initialize diagnostic system
    window.sfqDiagnostic = new SFQDiagnostic();

    // Add helper functions to window for console access
    window.sfqDebug = {
        showPanel: () => $('#sfq-diagnostic-panel').show(),
        hidePanel: () => $('#sfq-diagnostic-panel').hide(),
        clearLogs: () => window.sfqDiagnostic.clearLogs(),
        export: () => window.sfqDiagnostic.exportDiagnostic(),
        log: (level, message, data) => window.sfqDiagnostic.log(level, message, data)
    };

    // Show help message in console
    console.log('%cSFQ Diagnostic System Loaded', 'color: #0073aa; font-weight: bold;');
    console.log('Available commands:');
    console.log('- Ctrl+Shift+D: Toggle diagnostic panel');
    console.log('- Ctrl+Shift+C: Clear logs');
    console.log('- Ctrl+Shift+E: Export diagnostic data');
    console.log('- sfqDebug.showPanel(): Show diagnostic panel');
    console.log('- sfqDebug.log(level, message, data): Add custom log entry');
});
