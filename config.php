<?php
// Cargar variables de entorno desde .env
function loadEnv($path) {
    if (!file_exists($path)) {
        throw new Exception("El archivo .env no existe");
    }
    
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) {
            continue; // Saltar comentarios
        }
        
        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);
        
        if (!array_key_exists($name, $_ENV)) {
            $_ENV[$name] = $value;
        }
    }
}

// Cargar configuración
loadEnv(__DIR__ . '/.env');

// Configuración de base de datos
define('DB_HOST', $_ENV['DB_HOST'] ?? 'localhost');
define('DB_NAME', $_ENV['DB_NAME'] ?? 'islamhouse_data');
define('DB_USER', $_ENV['DB_USER'] ?? 'root');
define('DB_PASSWORD', $_ENV['DB_PASSWORD'] ?? '');
define('DB_PORT', $_ENV['DB_PORT'] ?? 3306);

// Clase para manejar la conexión a la base de datos
class Database {
    private static $instance = null;
    private $connection;
    
    private function __construct() {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";port=" . DB_PORT . ";charset=utf8mb4";
            $this->connection = new PDO($dsn, DB_USER, DB_PASSWORD, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
            ]);
        } catch (PDOException $e) {
            throw new Exception("Error de conexión a la base de datos: " . $e->getMessage());
        }
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    public function getConnection() {
        return $this->connection;
    }
    
    // Prevenir clonación
    private function __clone() {}
    
    // Prevenir deserialización
    public function __wakeup() {
        throw new Exception("Cannot unserialize singleton");
    }
}

// Función para obtener la conexión
function getDB() {
    return Database::getInstance()->getConnection();
}

// Configuración de la aplicación
define('ITEMS_PER_PAGE', 25);
define('MAX_DESCRIPTION_LENGTH', 200);

// Headers para CORS y JSON
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Función para limpiar texto y asegurar UTF-8 válido
function cleanText($text) {
    if (empty($text)) return '';
    
    // Convertir a string si no lo es
    $text = (string)$text;
    
    // Método más agresivo para limpiar UTF-8 malformado
    $text = @iconv('UTF-8', 'UTF-8//IGNORE', $text);
    if ($text === false) {
        // Si iconv falla, usar filtro de caracteres
        $text = filter_var($text, FILTER_UNSAFE_RAW, FILTER_FLAG_STRIP_LOW | FILTER_FLAG_STRIP_HIGH);
        $text = preg_replace('/[\x00-\x1F\x7F-\xFF]/', '', $text);
    }
    
    // Si es JSON, decodificar
    $decoded = json_decode($text, true);
    if (json_last_error() === JSON_ERROR_NONE) {
        if (is_array($decoded)) {
            // Filtrar elementos que no sean strings y convertir a string
            $stringElements = array_filter($decoded, function($item) {
                return is_string($item) || is_numeric($item);
            });
            $result = implode(', ', $stringElements);
            // Limpiar el resultado también
            return @iconv('UTF-8', 'UTF-8//IGNORE', $result) ?: $result;
        }
        $result = is_string($decoded) ? $decoded : (string)$decoded;
        return @iconv('UTF-8', 'UTF-8//IGNORE', $result) ?: $result;
    }
    
    // Limpiar HTML tags
    $text = strip_tags($text);
    return $text;
}

// Función para truncar descripción
function truncateDescription($text, $maxLength = MAX_DESCRIPTION_LENGTH) {
    $text = cleanText($text);
    if (strlen($text) <= $maxLength) {
        return $text;
    }
    return substr($text, 0, $maxLength) . '...';
}
?>
