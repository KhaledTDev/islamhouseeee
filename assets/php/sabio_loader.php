<?php
// sabio_loader.php - Script para cargar contenido dinámico de sabios
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Manejar solicitudes OPTIONS para CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    $action = $_GET['action'] ?? '';
    $sabio = $_GET['sabio'] ?? '';
    $category = $_GET['category'] ?? '';

    error_log("Sabio Loader: action=$action, sabio=$sabio, category=$category");

    switch ($action) {
        case 'get_sabios':
            echo json_encode(getSabiosList());
            break;
            
        case 'get_sabio_info':
            if (empty($sabio)) {
                throw new Exception('Nombre del sabio requerido');
            }
            echo json_encode(getSabioInfo($sabio));
            break;
            
        case 'get_sabio_content':
            if (empty($sabio) || empty($category)) {
                throw new Exception('Sabio y categoría requeridos');
            }
            echo json_encode(getSabioContent($sabio, $category));
            break;
            
        default:
            throw new Exception('Acción no válida');
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => true,
        'message' => $e->getMessage()
    ]);
}

/**
 * Obtener lista de todos los sabios disponibles
 */
function getSabiosList() {
    $sabiosDir = __DIR__ . '/../sabios/';
    
    if (!is_dir($sabiosDir)) {
        throw new Exception('Directorio de sabios no encontrado');
    }
    
    $sabios = [];
    $directories = scandir($sabiosDir);
    
    foreach ($directories as $dir) {
        if ($dir === '.' || $dir === '..') {
            continue;
        }
        
        $fullPath = $sabiosDir . $dir;
        if (is_dir($fullPath)) {
            $sabios[] = [
                'name' => $dir,
                'display_name' => $dir,
                'path' => $fullPath
            ];
        }
    }
    
    return [
        'success' => true,
        'data' => $sabios
    ];
}

/**
 * Obtener información completa de un sabio específico
 */
function getSabioInfo($sabioName) {
    $sabioDir = __DIR__ . '/../sabios/' . $sabioName . '/';
    
    if (!is_dir($sabioDir)) {
        throw new Exception('Sabio no encontrado: ' . $sabioName);
    }
    
    // Buscar imagen del sabio
    $imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    $sabioImage = null;
    
    foreach ($imageExtensions as $ext) {
        $imagePath = $sabioDir . strtolower(str_replace(' ', '', $sabioName)) . '.' . $ext;
        if (file_exists($imagePath)) {
            $sabioImage = 'assets/sabios/' . $sabioName . '/' . basename($imagePath);
            break;
        }
        
        // Buscar cualquier imagen en el directorio
        $files = glob($sabioDir . '*.' . $ext);
        if (!empty($files)) {
            $sabioImage = 'assets/sabios/' . $sabioName . '/' . basename($files[0]);
            break;
        }
    }
    
    // Contar archivos en cada subdirectorio
    $categories = ['duruz', 'firak', 'pdf'];
    $stats = [
        'total_audio' => 0,
        'total_pdf' => 0,
        'categories' => []
    ];
    
    foreach ($categories as $category) {
        $categoryDir = $sabioDir . $category . '/';
        $count = 0;
        
        if (is_dir($categoryDir)) {
            $files = scandir($categoryDir);
            foreach ($files as $file) {
                if ($file === '.' || $file === '..') {
                    continue;
                }
                
                $filePath = $categoryDir . $file;
                if (is_file($filePath)) {
                    $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
                    
                    if ($category === 'pdf' && $ext === 'pdf') {
                        $count++;
                        $stats['total_pdf']++;
                    } elseif (($category === 'duruz' || $category === 'firak') && 
                             in_array($ext, ['mp3', 'wav', 'ogg', 'mp4', 'mpeg'])) {
                        $count++;
                        $stats['total_audio']++;
                    }
                }
            }
        }
        
        $stats['categories'][$category] = $count;
    }
    
    return [
        'success' => true,
        'data' => [
            'name' => $sabioName,
            'image' => $sabioImage,
            'stats' => $stats
        ]
    ];
}

/**
 * Obtener contenido específico de una categoría del sabio
 */
function getSabioContent($sabioName, $category) {
    $categoryDir = __DIR__ . '/../sabios/' . $sabioName . '/' . $category . '/';
    
    if (!is_dir($categoryDir)) {
        throw new Exception("Categoría '$category' no encontrada para el sabio '$sabioName'");
    }
    
    $files = [];
    $allowedExtensions = [];
    
    // Definir extensiones permitidas según la categoría
    if ($category === 'pdf') {
        $allowedExtensions = ['pdf'];
    } else {
        $allowedExtensions = ['mp3', 'wav', 'ogg', 'mp4', 'mpeg'];
    }
    
    $scanFiles = scandir($categoryDir);
    
    foreach ($scanFiles as $file) {
        if ($file === '.' || $file === '..') {
            continue;
        }
        
        $filePath = $categoryDir . $file;
        if (is_file($filePath)) {
            $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
            
            if (in_array($ext, $allowedExtensions)) {
                $fileSize = filesize($filePath);
                $fileName = pathinfo($file, PATHINFO_FILENAME);
                
                $files[] = [
                    'name' => $fileName,
                    'filename' => $file,
                    'path' => 'assets/sabios/' . $sabioName . '/' . $category . '/' . $file,
                    'size' => $fileSize,
                    'extension' => $ext,
                    'type' => $category === 'pdf' ? 'document' : 'audio'
                ];
            }
        }
    }
    
    // Ordenar archivos por nombre
    usort($files, function($a, $b) {
        return strcmp($a['name'], $b['name']);
    });
    
    return [
        'success' => true,
        'data' => [
            'sabio' => $sabioName,
            'category' => $category,
            'files' => $files,
            'total' => count($files)
        ]
    ];
}
?>