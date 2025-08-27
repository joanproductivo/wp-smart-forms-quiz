<?php
/**
 * Debug script for Smart Forms Quiz statistics issue
 * This script helps identify why calculate_questions_stats() returns 0 questions
 */

// Simulate WordPress environment constants
if (!defined('ABSPATH')) {
    define('ABSPATH', '/path/to/wordpress/');
}

// Mock WordPress functions for testing
if (!function_exists('wp_send_json_error')) {
    function wp_send_json_error($message) {
        echo "ERROR: " . $message . "\n";
    }
}

if (!function_exists('wp_send_json_success')) {
    function wp_send_json_success($data) {
        echo "SUCCESS: " . json_encode($data, JSON_PRETTY_PRINT) . "\n";
    }
}

if (!function_exists('current_user_can')) {
    function current_user_can($capability) {
        return true; // Mock admin permissions
    }
}

if (!function_exists('check_ajax_referer')) {
    function check_ajax_referer($action, $query_arg, $die) {
        return true; // Mock nonce verification
    }
}

if (!function_exists('__')) {
    function __($text, $domain = '') {
        return $text; // Mock translation
    }
}

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field($str) {
        return trim(strip_tags($str));
    }
}

if (!function_exists('intval')) {
    // intval already exists in PHP
}

if (!function_exists('error_log')) {
    // error_log already exists in PHP
}

// Mock WordPress database class
class MockWPDB {
    public $prefix = 'wp_';
    
    public function prepare($query, ...$args) {
        // Simple prepare simulation
        $prepared = $query;
        foreach ($args as $arg) {
            $prepared = preg_replace('/%[sd]/', "'" . addslashes($arg) . "'", $prepared, 1);
        }
        return $prepared;
    }
    
    public function get_results($query) {
        echo "QUERY: " . $query . "\n";
        
        // Mock data based on the task description
        if (strpos($query, 'sfq_questions') !== false && strpos($query, 'form_id = \'9\'') !== false) {
            // Return 4 mock questions for form_id 9
            return [
                (object)[
                    'id' => 1,
                    'form_id' => 9,
                    'question_text' => 'Test Question 1',
                    'question_type' => 'single_choice',
                    'options' => '["Option A", "Option B", "Option C"]',
                    'order_index' => 1
                ],
                (object)[
                    'id' => 2,
                    'form_id' => 9,
                    'question_text' => 'Test Question 2',
                    'question_type' => 'multiple_choice',
                    'options' => '["Choice 1", "Choice 2", "Choice 3"]',
                    'order_index' => 2
                ],
                (object)[
                    'id' => 3,
                    'form_id' => 9,
                    'question_text' => 'Test Question 3',
                    'question_type' => 'text',
                    'options' => '',
                    'order_index' => 3
                ],
                (object)[
                    'id' => 4,
                    'form_id' => 9,
                    'question_text' => 'Test Question 4',
                    'question_type' => 'rating',
                    'options' => '',
                    'max_rating' => 5,
                    'order_index' => 4
                ]
            ];
        }
        
        // Mock responses data
        if (strpos($query, 'sfq_responses') !== false) {
            return [
                (object)['answer' => 'Option A', 'count' => 10],
                (object)['answer' => 'Option B', 'count' => 5],
                (object)['answer' => 'Option C', 'count' => 3]
            ];
        }
        
        return [];
    }
    
    public function get_var($query) {
        echo "QUERY: " . $query . "\n";
        
        // Mock verification queries
        if (strpos($query, 'COUNT(*)') !== false) {
            if (strpos($query, 'sfq_forms') !== false) {
                return 1; // Form exists
            }
            if (strpos($query, 'sfq_questions') !== false) {
                return 4; // 4 questions
            }
            if (strpos($query, 'sfq_submissions') !== false) {
                if (strpos($query, 'completed') !== false) {
                    return 19; // 19 completed submissions
                }
                return 35; // 35 total submissions
            }
            if (strpos($query, 'sfq_responses') !== false) {
                return 35; // 35 total responses
            }
        }
        
        return 0;
    }
}

// Mock SFQ_Database class
class SFQ_Database {
    public function get_form($form_id) {
        if ($form_id == 9) {
            return (object)[
                'id' => 9,
                'title' => 'Test Form',
                'description' => 'Test form for debugging',
                'type' => 'quiz'
            ];
        }
        return null;
    }
}

// Initialize mock global $wpdb
$wpdb = new MockWPDB();

// Load the statistics class (simplified version for testing)
class SFQ_Form_Statistics_Debug {
    private $database;
    private $wpdb;
    
    public function __construct() {
        global $wpdb;
        $this->database = new SFQ_Database();
        $this->wpdb = $wpdb;
    }
    
    /**
     * Test the calculate_questions_stats method with debugging
     */
    public function test_calculate_questions_stats($form_id, $date_condition = ['where' => '', 'params' => []]) {
        echo "\n=== TESTING calculate_questions_stats ===\n";
        echo "Form ID: $form_id\n";
        echo "Date condition: " . json_encode($date_condition) . "\n\n";
        
        // Debug: Log the input parameters
        error_log("SFQ Debug: calculate_questions_stats called with form_id: $form_id");
        error_log("SFQ Debug: date_condition: " . json_encode($date_condition));
        
        // Debug: Verify table exists and form_id parameter
        $table_name = $this->wpdb->prefix . 'sfq_questions';
        error_log("SFQ Debug: Querying table: $table_name");
        error_log("SFQ Debug: Form ID parameter: $form_id (type: " . gettype($form_id) . ")");
        
        // Obtener todas las preguntas del formulario
        $questions_query = "SELECT * FROM {$this->wpdb->prefix}sfq_questions WHERE form_id = %d ORDER BY order_index ASC";
        $prepared_questions_query = $this->wpdb->prepare($questions_query, $form_id);
        error_log("SFQ Debug: Questions query: " . $prepared_questions_query);
        
        $questions = $this->wpdb->get_results($prepared_questions_query);
        
        // Debug: Log raw result
        error_log("SFQ Debug: Raw questions result: " . print_r($questions, true));
        error_log("SFQ Debug: Questions found: " . count($questions));
        
        if (empty($questions)) {
            error_log("SFQ Debug: No questions found for form_id: $form_id");
            
            // Additional debugging: Check if any questions exist at all
            $all_questions = $this->wpdb->get_results("SELECT id, form_id, question_text FROM {$this->wpdb->prefix}sfq_questions LIMIT 10");
            error_log("SFQ Debug: Sample of all questions in database: " . print_r($all_questions, true));
            
            // Check if the specific form_id exists in questions table
            $form_questions_any = $this->wpdb->get_results($this->wpdb->prepare(
                "SELECT id, form_id, question_text FROM {$this->wpdb->prefix}sfq_questions WHERE form_id = %d",
                $form_id
            ));
            error_log("SFQ Debug: Direct query for form_id $form_id: " . print_r($form_questions_any, true));
            
            return array();
        }
        
        error_log("SFQ Debug: Successfully found " . count($questions) . " questions for form_id: $form_id");
        
        echo "Questions found: " . count($questions) . "\n";
        foreach ($questions as $question) {
            echo "- Question {$question->id}: {$question->question_text} (type: {$question->question_type})\n";
        }
        
        return $questions;
    }
    
    /**
     * Test form verification
     */
    public function test_verify_form_data($form_id) {
        echo "\n=== TESTING verify_form_data ===\n";
        
        $verification = array();
        
        // Verificar que el formulario existe
        $form_exists = $this->wpdb->get_var($this->wpdb->prepare(
            "SELECT COUNT(*) FROM {$this->wpdb->prefix}sfq_forms WHERE id = %d",
            $form_id
        ));
        $verification['form_exists'] = intval($form_exists) > 0;
        
        // Contar preguntas
        $questions_count = $this->wpdb->get_var($this->wpdb->prepare(
            "SELECT COUNT(*) FROM {$this->wpdb->prefix}sfq_questions WHERE form_id = %d",
            $form_id
        ));
        $verification['questions_count'] = intval($questions_count);
        
        // Contar submissions totales
        $total_submissions = $this->wpdb->get_var($this->wpdb->prepare(
            "SELECT COUNT(*) FROM {$this->wpdb->prefix}sfq_submissions WHERE form_id = %d",
            $form_id
        ));
        $verification['total_submissions'] = intval($total_submissions);
        
        // Contar submissions completadas
        $completed_submissions = $this->wpdb->get_var($this->wpdb->prepare(
            "SELECT COUNT(*) FROM {$this->wpdb->prefix}sfq_submissions WHERE form_id = %d AND status = 'completed'",
            $form_id
        ));
        $verification['completed_submissions'] = intval($completed_submissions);
        
        // Contar respuestas totales
        $total_responses = $this->wpdb->get_var($this->wpdb->prepare(
            "SELECT COUNT(*) FROM {$this->wpdb->prefix}sfq_responses r 
            INNER JOIN {$this->wpdb->prefix}sfq_submissions s ON r.submission_id = s.id 
            WHERE s.form_id = %d",
            $form_id
        ));
        $verification['total_responses'] = intval($total_responses);
        
        echo "Form verification results:\n";
        foreach ($verification as $key => $value) {
            echo "- $key: $value\n";
        }
        
        return $verification;
    }
}

// Run the test
echo "Smart Forms Quiz - Statistics Debug Script\n";
echo "==========================================\n";

$debug = new SFQ_Form_Statistics_Debug();

// Test with form_id 9 (from the task description)
$form_id = 9;

// Test form verification first
$verification = $debug->test_verify_form_data($form_id);

// Test questions stats calculation
$date_condition = ['where' => '', 'params' => []];
$questions = $debug->test_calculate_questions_stats($form_id, $date_condition);

echo "\n=== SUMMARY ===\n";
echo "Form verification shows:\n";
echo "- Form exists: " . ($verification['form_exists'] ? 'YES' : 'NO') . "\n";
echo "- Questions count: " . $verification['questions_count'] . "\n";
echo "- Total submissions: " . $verification['total_submissions'] . "\n";
echo "- Completed submissions: " . $verification['completed_submissions'] . "\n";
echo "- Total responses: " . $verification['total_responses'] . "\n";

echo "\nQuestions stats calculation:\n";
echo "- Questions found by calculate_questions_stats: " . count($questions) . "\n";

if ($verification['questions_count'] > 0 && count($questions) == 0) {
    echo "\n❌ ISSUE IDENTIFIED: Verification shows {$verification['questions_count']} questions exist, but calculate_questions_stats found 0\n";
    echo "This suggests a problem with the questions query in calculate_questions_stats method.\n";
} elseif (count($questions) > 0) {
    echo "\n✅ SUCCESS: Questions are being retrieved correctly\n";
} else {
    echo "\n⚠️  No questions found in either verification or calculation\n";
}

echo "\nCheck the debug output above to identify the specific issue.\n";
?>
