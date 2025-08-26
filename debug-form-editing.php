<?php
/**
 * Debug script for form editing issues
 * This script will help identify why questions don't load and conditional logic is not accessible
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    require_once('../../../wp-config.php');
}

// Check if we're in WordPress admin
if (!is_admin() && !defined('WP_CLI')) {
    wp_die('This script can only be run from WordPress admin or CLI.');
}

class SFQ_Debug_Form_Editing {
    
    private $database;
    
    public function __construct() {
        $this->database = new SFQ_Database();
    }
    
    public function run_diagnostics() {
        echo "<h1>Smart Forms & Quiz - Form Editing Debug Report</h1>\n";
        echo "<style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .debug-section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; }
            .success { color: green; }
            .error { color: red; }
            .warning { color: orange; }
            .code { background: #f5f5f5; padding: 10px; margin: 10px 0; font-family: monospace; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
        </style>\n";
        
        $this->check_database_structure();
        $this->check_ajax_endpoints();
        $this->check_javascript_loading();
        $this->test_form_data_retrieval();
        $this->check_conditional_logic_structure();
        $this->test_sample_form();
        $this->provide_solutions();
    }
    
    private function check_database_structure() {
        echo "<div class='debug-section'>\n";
        echo "<h2>1. Database Structure Check</h2>\n";
        
        global $wpdb;
        
        $tables = [
            'sfq_forms' => $wpdb->prefix . 'sfq_forms',
            'sfq_questions' => $wpdb->prefix . 'sfq_questions',
            'sfq_conditions' => $wpdb->prefix . 'sfq_conditions'
        ];
        
        foreach ($tables as $name => $table) {
            $exists = $wpdb->get_var("SHOW TABLES LIKE '$table'");
            if ($exists) {
                echo "<p class='success'>✓ Table $name exists</p>\n";
                
                // Check table structure
                $columns = $wpdb->get_results("DESCRIBE $table");
                echo "<details><summary>View $name structure</summary>\n";
                echo "<table><tr><th>Field</th><th>Type</th><th>Null</th><th>Key</th></tr>\n";
                foreach ($columns as $column) {
                    echo "<tr><td>{$column->Field}</td><td>{$column->Type}</td><td>{$column->Null}</td><td>{$column->Key}</td></tr>\n";
                }
                echo "</table></details>\n";
            } else {
                echo "<p class='error'>✗ Table $name does not exist</p>\n";
            }
        }
        
        echo "</div>\n";
    }
    
    private function check_ajax_endpoints() {
        echo "<div class='debug-section'>\n";
        echo "<h2>2. AJAX Endpoints Check</h2>\n";
        
        // Check if AJAX class is loaded
        if (class_exists('SFQ_Ajax')) {
            echo "<p class='success'>✓ SFQ_Ajax class exists</p>\n";
            
            $ajax = new SFQ_Ajax();
            
            // Check if hooks are registered
            $hooks_to_check = [
                'wp_ajax_sfq_get_form_data',
                'wp_ajax_sfq_save_form'
            ];
            
            foreach ($hooks_to_check as $hook) {
                if (has_action($hook)) {
                    echo "<p class='success'>✓ Hook $hook is registered</p>\n";
                } else {
                    echo "<p class='error'>✗ Hook $hook is NOT registered</p>\n";
                }
            }
        } else {
            echo "<p class='error'>✗ SFQ_Ajax class does not exist</p>\n";
        }
        
        echo "</div>\n";
    }
    
    private function check_javascript_loading() {
        echo "<div class='debug-section'>\n";
        echo "<h2>3. JavaScript Loading Check</h2>\n";
        
        $admin_js_path = plugin_dir_path(__FILE__) . 'assets/js/admin.js';
        if (file_exists($admin_js_path)) {
            echo "<p class='success'>✓ admin.js file exists</p>\n";
            
            $js_content = file_get_contents($admin_js_path);
            
            // Check for key functions
            $functions_to_check = [
                'loadFormData',
                'createQuestionElement',
                'bindQuestionEvents',
                'addCondition'
            ];
            
            foreach ($functions_to_check as $func) {
                if (strpos($js_content, $func) !== false) {
                    echo "<p class='success'>✓ Function $func found in admin.js</p>\n";
                } else {
                    echo "<p class='error'>✗ Function $func NOT found in admin.js</p>\n";
                }
            }
            
            // Check for sfq_ajax object usage
            if (strpos($js_content, 'sfq_ajax') !== false) {
                echo "<p class='success'>✓ sfq_ajax object is referenced</p>\n";
            } else {
                echo "<p class='error'>✗ sfq_ajax object is NOT referenced</p>\n";
            }
            
        } else {
            echo "<p class='error'>✗ admin.js file does not exist at: $admin_js_path</p>\n";
        }
        
        echo "</div>\n";
    }
    
    private function test_form_data_retrieval() {
        echo "<div class='debug-section'>\n";
        echo "<h2>4. Form Data Retrieval Test</h2>\n";
        
        global $wpdb;
        
        // Get a sample form
        $sample_form = $wpdb->get_row("SELECT * FROM {$wpdb->prefix}sfq_forms LIMIT 1");
        
        if ($sample_form) {
            echo "<p class='success'>✓ Sample form found (ID: {$sample_form->id})</p>\n";
            
            // Test database get_form method
            $form_data = $this->database->get_form($sample_form->id);
            
            if ($form_data) {
                echo "<p class='success'>✓ Database get_form() method works</p>\n";
                
                echo "<h3>Form Data Structure:</h3>\n";
                echo "<div class='code'>\n";
                echo "Title: " . htmlspecialchars($form_data->title) . "\n";
                echo "Type: " . htmlspecialchars($form_data->type) . "\n";
                echo "Questions count: " . (is_array($form_data->questions) ? count($form_data->questions) : 'NULL') . "\n";
                
                if (is_array($form_data->questions) && !empty($form_data->questions)) {
                    echo "\nQuestions:\n";
                    foreach ($form_data->questions as $i => $question) {
                        echo "  Question " . ($i + 1) . ":\n";
                        echo "    Text: " . htmlspecialchars($question->question_text) . "\n";
                        echo "    Type: " . htmlspecialchars($question->question_type) . "\n";
                        echo "    Options: " . (is_array($question->options) ? count($question->options) . " options" : 'NULL') . "\n";
                        echo "    Conditions: " . (is_array($question->conditions) ? count($question->conditions) . " conditions" : 'NULL') . "\n";
                        
                        if (is_array($question->conditions) && !empty($question->conditions)) {
                            foreach ($question->conditions as $j => $condition) {
                                echo "      Condition " . ($j + 1) . ": {$condition->condition_type} -> {$condition->action_type}\n";
                            }
                        }
                    }
                } else {
                    echo "\n<span class='error'>No questions found or questions is not an array!</span>\n";
                }
                echo "</div>\n";
                
                // Test JSON encoding
                $json_data = json_encode($form_data);
                if ($json_data) {
                    echo "<p class='success'>✓ Form data can be JSON encoded</p>\n";
                } else {
                    echo "<p class='error'>✗ Form data cannot be JSON encoded: " . json_last_error_msg() . "</p>\n";
                }
                
            } else {
                echo "<p class='error'>✗ Database get_form() method returned NULL</p>\n";
            }
            
        } else {
            echo "<p class='warning'>⚠ No sample forms found in database</p>\n";
            
            // Create a test form
            echo "<p>Creating test form...</p>\n";
            $this->create_test_form();
        }
        
        echo "</div>\n";
    }
    
    private function check_conditional_logic_structure() {
        echo "<div class='debug-section'>\n";
        echo "<h2>5. Conditional Logic Structure Check</h2>\n";
        
        // Check CSS for conditional logic
        $admin_css_path = plugin_dir_path(__FILE__) . 'assets/css/admin.css';
        if (file_exists($admin_css_path)) {
            $css_content = file_get_contents($admin_css_path);
            
            $css_classes_to_check = [
                'sfq-conditions-section',
                'sfq-conditions-container',
                'sfq-condition-item',
                'sfq-add-condition'
            ];
            
            foreach ($css_classes_to_check as $class) {
                if (strpos($css_content, $class) !== false) {
                    echo "<p class='success'>✓ CSS class .$class found</p>\n";
                } else {
                    echo "<p class='warning'>⚠ CSS class .$class NOT found</p>\n";
                }
            }
        }
        
        // Check HTML structure in admin.php
        $admin_php_path = plugin_dir_path(__FILE__) . 'includes/class-sfq-admin.php';
        if (file_exists($admin_php_path)) {
            $admin_content = file_get_contents($admin_php_path);
            
            if (strpos($admin_content, 'sfq-questions-container') !== false) {
                echo "<p class='success'>✓ Questions container found in admin template</p>\n";
            } else {
                echo "<p class='error'>✗ Questions container NOT found in admin template</p>\n";
            }
        }
        
        echo "</div>\n";
    }
    
    private function test_sample_form() {
        echo "<div class='debug-section'>\n";
        echo "<h2>6. Sample Form Creation Test</h2>\n";
        
        // Create a test form with questions and conditions
        $test_form_data = [
            'title' => 'Debug Test Form',
            'description' => 'Test form for debugging',
            'type' => 'form',
            'settings' => [],
            'style_settings' => [],
            'questions' => [
                [
                    'question_text' => 'What is your favorite color?',
                    'question_type' => 'single_choice',
                    'options' => [
                        ['text' => 'Red', 'value' => 'red'],
                        ['text' => 'Blue', 'value' => 'blue'],
                        ['text' => 'Green', 'value' => 'green']
                    ],
                    'required' => 1,
                    'conditions' => [
                        [
                            'condition_type' => 'answer_equals',
                            'condition_value' => 'red',
                            'action_type' => 'redirect_url',
                            'action_value' => 'https://example.com/red'
                        ]
                    ]
                ]
            ]
        ];
        
        $form_id = $this->database->save_form($test_form_data);
        
        if ($form_id) {
            echo "<p class='success'>✓ Test form created with ID: $form_id</p>\n";
            
            // Retrieve the form to test
            $retrieved_form = $this->database->get_form($form_id);
            
            if ($retrieved_form && !empty($retrieved_form->questions)) {
                echo "<p class='success'>✓ Test form retrieved successfully with questions</p>\n";
                
                $question = $retrieved_form->questions[0];
                if (!empty($question->conditions)) {
                    echo "<p class='success'>✓ Conditional logic saved and retrieved correctly</p>\n";
                } else {
                    echo "<p class='error'>✗ Conditional logic NOT saved or retrieved</p>\n";
                }
            } else {
                echo "<p class='error'>✗ Test form retrieved but no questions found</p>\n";
            }
            
            // Clean up - delete test form
            global $wpdb;
            $wpdb->delete($wpdb->prefix . 'sfq_forms', ['id' => $form_id], ['%d']);
            echo "<p>Test form cleaned up.</p>\n";
            
        } else {
            echo "<p class='error'>✗ Failed to create test form</p>\n";
        }
        
        echo "</div>\n";
    }
    
    private function provide_solutions() {
        echo "<div class='debug-section'>\n";
        echo "<h2>7. Recommended Solutions</h2>\n";
        
        echo "<h3>Issue 1: Questions not loading in sfq-question-content</h3>\n";
        echo "<p><strong>Likely causes:</strong></p>\n";
        echo "<ul>\n";
        echo "<li>JavaScript loadFormData() method not being called properly</li>\n";
        echo "<li>AJAX response not containing questions data</li>\n";
        echo "<li>DOM manipulation failing in createQuestionElement()</li>\n";
        echo "<li>Questions data structure mismatch</li>\n";
        echo "</ul>\n";
        
        echo "<h3>Issue 2: Conditional logic section not accessible</h3>\n";
        echo "<p><strong>Likely causes:</strong></p>\n";
        echo "<ul>\n";
        echo "<li>CSS hiding the details/summary elements</li>\n";
        echo "<li>JavaScript event binding not working for conditional logic</li>\n";
        echo "<li>HTML structure issues with details/summary tags</li>\n";
        echo "</ul>\n";
        
        echo "<h3>Issue 3: URL redirect conditional logic not working</h3>\n";
        echo "<p><strong>Likely causes:</strong></p>\n";
        echo "<ul>\n";
        echo "<li>Condition evaluation logic in determine_redirect() method</li>\n";
        echo "<li>Frontend JavaScript not properly handling redirects</li>\n";
        echo "<li>Database conditions not being saved correctly</li>\n";
        echo "</ul>\n";
        
        echo "<h3>Next Steps:</h3>\n";
        echo "<ol>\n";
        echo "<li>Fix the loadFormData() method to properly handle questions</li>\n";
        echo "<li>Ensure conditional logic HTML structure is correct</li>\n";
        echo "<li>Debug the frontend redirect logic</li>\n";
        echo "<li>Add proper error handling and logging</li>\n";
        echo "</ol>\n";
        
        echo "</div>\n";
    }
    
    private function create_test_form() {
        $test_data = [
            'title' => 'Test Form for Debugging',
            'description' => 'This is a test form',
            'type' => 'form',
            'settings' => [],
            'style_settings' => [],
            'questions' => [
                [
                    'question_text' => 'Test Question',
                    'question_type' => 'single_choice',
                    'options' => [
                        ['text' => 'Option 1', 'value' => 'opt1'],
                        ['text' => 'Option 2', 'value' => 'opt2']
                    ],
                    'required' => 1
                ]
            ]
        ];
        
        $form_id = $this->database->save_form($test_data);
        if ($form_id) {
            echo "<p class='success'>✓ Test form created with ID: $form_id</p>\n";
        } else {
            echo "<p class='error'>✗ Failed to create test form</p>\n";
        }
    }
}

// Run the diagnostics
if (isset($_GET['run_debug']) || (defined('WP_CLI') && WP_CLI)) {
    $debug = new SFQ_Debug_Form_Editing();
    $debug->run_diagnostics();
} else {
    echo "<h1>Smart Forms & Quiz Debug Tool</h1>";
    echo "<p><a href='?run_debug=1'>Click here to run diagnostics</a></p>";
}
