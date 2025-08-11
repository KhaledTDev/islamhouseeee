<?php
require_once 'config.php';

// Manejar solicitudes OPTIONS para CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    error_log("API called with action: " . ($_GET['action'] ?? 'none'));
    
    $db = getDB();
    $action = $_GET['action'] ?? '';
    $category = $_GET['category'] ?? '';
    $page = max(1, intval($_GET['page'] ?? 1));
    $search = $_GET['search'] ?? '';
    $id = $_GET['id'] ?? '';

    error_log("Processing action: $action, category: $category, page: $page");

    switch ($action) {
        case 'categories':
            $result = getCategories($db);
            error_log("Categories result: " . json_encode($result));
            echo json_encode($result);
            break;
            
        case 'items':
            error_log("Getting items for category: $category");
            $result = getItems($db, $category, $page, $search);
            error_log("Items result count: " . count($result['data'] ?? []));
            
            // Usar flags especiales para manejar UTF-8 problemático
            $json = json_encode($result, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE | JSON_PARTIAL_OUTPUT_ON_ERROR);
            if ($json === false) {
                error_log("JSON encode error: " . json_last_error_msg());
                
                // Último recurso: devolver datos básicos sin procesar
                $basicResult = [
                    'success' => true,
                    'data' => [],
                    'pagination' => $result['pagination'] ?? []
                ];
                echo json_encode($basicResult);
            } else {
                echo $json;
            }
            break;
            
        case 'item':
            $result = getItemById($db, $category, $id);
            echo json_encode($result);
            break;
            
        case 'stats':
            $result = getStats($db);
            error_log("Stats result: " . json_encode($result));
            echo json_encode($result);
            break;
            
        case 'search':
            error_log("Searching with term: '$search', page: $page");
            $result = searchItems($db, $search, $page);
            error_log("Search result count: " . count($result['data'] ?? []));
            
            // Usar flags especiales para manejar UTF-8 problemático
            $json = json_encode($result, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE | JSON_PARTIAL_OUTPUT_ON_ERROR);
            if ($json === false) {
                error_log("JSON encode error in search: " . json_last_error_msg());
                
                // Último recurso: devolver datos básicos sin procesar
                $basicResult = [
                    'success' => true,
                    'data' => [],
                    'pagination' => $result['pagination'] ?? []
                ];
                echo json_encode($basicResult);
            } else {
                echo $json;
            }
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

// Función para obtener categorías disponibles
function getCategories($db) {
    $categories = [];
    $tables = ['books', 'articles', 'fatwa', 'audios', 'videos'];
    
    foreach ($tables as $table) {
        try {
            $stmt = $db->prepare("SELECT COUNT(*) as count FROM `$table`");
            $stmt->execute();
            $result = $stmt->fetch();
            
            if ($result['count'] > 0) {
                $categories[] = [
                    'name' => $table,
                    'display_name' => ucfirst($table),
                    'count' => $result['count']
                ];
            }
        } catch (Exception $e) {
            // Tabla no existe, continuar
            continue;
        }
    }
    
    return [
        'success' => true,
        'data' => $categories
    ];
}

// Función para obtener items de una categoría
function getItems($db, $category, $page, $search = '') {
    if (empty($category)) {
        throw new Exception('Categoría requerida');
    }
    
    $validCategories = ['books', 'articles', 'fatwa', 'audios', 'videos'];
    if (!in_array($category, $validCategories)) {
        throw new Exception('Categoría no válida');
    }
    
    $offset = ($page - 1) * ITEMS_PER_PAGE;
    $baseQuery = "FROM `$category` WHERE 1=1";
    $params = [];
    
    // Configurar búsqueda según categoría
    if (!empty($search)) {
        if ($category === 'books') {
            $baseQuery .= " AND (name LIKE :search OR topics LIKE :search OR author LIKE :search)";
        } elseif ($category === 'fatwa') {
            $baseQuery .= " AND (title LIKE :search OR question LIKE :search OR answer LIKE :search)";
        } else {
            $baseQuery .= " AND (title LIKE :search OR description LIKE :search OR prepared_by LIKE :search)";
        }
        $params[':search'] = '%' . $search . '%';
    }
    
    // Configurar campo de ordenación según categoría
    if ($category === 'books' || $category === 'fatwa') {
        $orderField = 'id';
    } else {
        $orderField = 'extracted_at';
    }
    
    // Contar total
    $countStmt = $db->prepare("SELECT COUNT(*) as total $baseQuery");
    $countStmt->execute($params);
    $total = $countStmt->fetch()['total'];
    
    // Obtener items
    $query = "SELECT * $baseQuery ORDER BY $orderField DESC LIMIT :limit OFFSET :offset";
    $stmt = $db->prepare($query);
    
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->bindValue(':limit', ITEMS_PER_PAGE, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    
    $stmt->execute();
    $items = $stmt->fetchAll();
    
    // Procesar items
    $processedItems = array_map(function($item) use ($category) {
        return processItem($item, $category);
    }, $items);
    
    return [
        'success' => true,
        'data' => $processedItems,
        'pagination' => [
            'current_page' => $page,
            'total_pages' => ceil($total / ITEMS_PER_PAGE),
            'total_items' => $total,
            'items_per_page' => ITEMS_PER_PAGE
        ]
    ];
}

// Función para obtener un item específico por ID
function getItemById($db, $category, $id) {
    if (empty($category) || empty($id)) {
        throw new Exception('Categoría e ID requeridos');
    }
    
    // Validar categoría
    $validCategories = ['books', 'articles', 'fatwa', 'audios', 'videos'];
    if (!in_array($category, $validCategories)) {
        throw new Exception('Categoría no válida');
    }
    
    $stmt = $db->prepare("SELECT * FROM `$category` WHERE id = :id");
    $stmt->bindValue(':id', $id);
    $stmt->execute();
    
    $item = $stmt->fetch();
    
    if (!$item) {
        throw new Exception('Item no encontrado');
    }
    
    return [
        'success' => true,
        'data' => processItem($item)
    ];
}

// Función para obtener estadísticas
function getStats($db) {
    $stats = [];
    $tables = ['books', 'articles', 'fatwa', 'audios', 'videos'];
    $total = 0;
    
    foreach ($tables as $table) {
        try {
            $stmt = $db->prepare("SELECT COUNT(*) as count FROM `$table`");
            $stmt->execute();
            $result = $stmt->fetch();
            
            $count = $result['count'];
            $stats[$table] = $count;
            $total += $count;
        } catch (Exception $e) {
            $stats[$table] = 0;
        }
    }
    
    return [
        'success' => true,
        'data' => [
            'total_items' => $total,
            'categories' => $stats
        ]
    ];
}

// Función para búsqueda global
function searchItems($db, $search, $page) {
    // Si no hay término de búsqueda, devolver elementos de todas las categorías
    $isEmptySearch = empty($search);
    
    $offset = ($page - 1) * ITEMS_PER_PAGE;
    $results = [];
    $total = 0;
    
    $tables = ['books', 'articles', 'fatwa', 'audios', 'videos'];
    
    foreach ($tables as $table) {
        try {
            if ($isEmptySearch) {
                // Sin término de búsqueda, obtener todos los elementos
                $countStmt = $db->prepare("SELECT COUNT(*) as count FROM `$table`");
                $countStmt->execute();
                $tableTotal = $countStmt->fetch()['count'];
                $total += $tableTotal;
                
                // Determinar campo de ordenación según la tabla
                $orderField = ($table === 'books') ? 'id' : 'extracted_at';
                
                // Obtener algunos resultados de esta tabla
                $stmt = $db->prepare("
                    SELECT *, '$table' as category 
                    FROM `$table` 
                    ORDER BY $orderField DESC 
                    LIMIT 10
                ");
                $stmt->execute();
            } else {
                // Con término de búsqueda
                if ($table === 'books') {
                    $countStmt = $db->prepare("
                        SELECT COUNT(*) as count 
                        FROM `$table` 
                        WHERE name LIKE :search 
                           OR topics LIKE :search 
                           OR author LIKE :search
                    ");
                } else {
                    $countStmt = $db->prepare("
                        SELECT COUNT(*) as count 
                        FROM `$table` 
                        WHERE title LIKE :search 
                           OR description LIKE :search 
                           OR prepared_by LIKE :search
                    ");
                }
                $countStmt->bindValue(':search', '%' . $search . '%');
                $countStmt->execute();
                $tableTotal = $countStmt->fetch()['count'];
                $total += $tableTotal;
                
                // Determinar campo de ordenación según la tabla
                $orderField = ($table === 'books') ? 'id' : 'extracted_at';
                
                // Obtener algunos resultados de esta tabla
                if ($table === 'books') {
                    $stmt = $db->prepare("
                        SELECT *, '$table' as category 
                        FROM `$table` 
                        WHERE name LIKE :search 
                           OR topics LIKE :search 
                           OR author LIKE :search
                        ORDER BY $orderField DESC 
                        LIMIT 10
                    ");
                } else {
                    $stmt = $db->prepare("
                        SELECT *, '$table' as category 
                        FROM `$table` 
                        WHERE title LIKE :search 
                           OR description LIKE :search 
                           OR prepared_by LIKE :search
                        ORDER BY $orderField DESC 
                        LIMIT 10
                    ");
                }
                $stmt->bindValue(':search', '%' . $search . '%');
                $stmt->execute();
            }
            
            $tableResults = $stmt->fetchAll();
            foreach ($tableResults as $item) {
                $results[] = processItem($item, $table);
            }
            
        } catch (Exception $e) {
            continue;
        }
    }
    
    // Ordenar por fecha y paginar
    usort($results, function($a, $b) {
        // Para libros, ordenar por ID (o el campo que prefieras)
        if ($a['type'] === 'books' || $b['type'] === 'books') {
            return $b['id'] - $a['id'];
        }
        // Para otros tipos, intentar ordenar por extracted_at si existe
        $dateA = strtotime($a['extracted_at'] ?? 0);
        $dateB = strtotime($b['extracted_at'] ?? 0);
        return $dateB - $dateA;
    });
    
    $paginatedResults = array_slice($results, $offset, ITEMS_PER_PAGE);
    
    return [
        'success' => true,
        'data' => $paginatedResults,
        'pagination' => [
            'current_page' => $page,
            'total_pages' => ceil($total / ITEMS_PER_PAGE),
            'total_items' => $total,
            'items_per_page' => ITEMS_PER_PAGE
        ]
    ];
}

// Función para procesar un item
function processItem($item, $category = null) {
    $processed = [];
    
    // Procesamiento especial para la tabla books
    if ($category === 'books') {
        $bookFields = [
            'id', 'name', 'author', 'open_file', 'pages', 'files', 'parts',
            'researcher_supervisor', 'publisher', 'publication_country', 'city',
            'main_category', 'sub_category', 'topics', 'download_link',
            'alternative_link', 'section_books_count', 'parts_count', 'size_bytes', 'format'
        ];
        
        foreach ($bookFields as $field) {
            $processed[$field] = isset($item[$field]) ? cleanText($item[$field]) : null;
        }
        
        // Campos adicionales para compatibilidad
        $processed['title'] = $processed['name'] ?? '';
        $processed['description'] = $processed['topics'] ?? '';
        $processed['prepared_by'] = $processed['author'] ?? '';
        
    } 
    // Procesamiento especial para la tabla fatwa
    elseif ($category === 'fatwa') {
        $fatwaFields = ['id', 'title', 'question', 'answer', 'audio'];
        
        foreach ($fatwaFields as $field) {
            $processed[$field] = isset($item[$field]) ? cleanText($item[$field]) : null;
        }
        
        // Campos adicionales para compatibilidad
        $processed['description'] = $processed['answer'] ?? '';
        $processed['prepared_by'] = '';
        
    } 
    // Procesamiento para otras tablas (articles, audios, videos)
    else {
        foreach ($item as $key => $value) {
            switch ($key) {
                case 'description':
                case 'localized_name':
                case 'prepared_by':
                case 'translators':
                case 'add_date':
                case 'pub_date':
                case 'title':
                    $processed[$key] = cleanText($value);
                    break;
                    
                case 'attachments':
                    $attachments = json_decode($value, true);
                    if (json_last_error() === JSON_ERROR_NONE && is_array($attachments)) {
                        $processed[$key] = $attachments;
                    } else {
                        $processed[$key] = [];
                    }
                    break;
                    
                default:
                    if (is_string($value)) {
                        $cleaned = @iconv('UTF-8', 'UTF-8//IGNORE', $value);
                        if ($cleaned === false) {
                            $cleaned = filter_var($value, FILTER_UNSAFE_RAW, FILTER_FLAG_STRIP_LOW | FILTER_FLAG_STRIP_HIGH);
                            $cleaned = preg_replace('/[\x00-\x1F\x7F-\xFF]/', '', $cleaned);
                        }
                        $processed[$key] = $cleaned;
                    } else {
                        $processed[$key] = $value;
                    }
                    break;
            }
        }
    }
    
    // Procesamiento común para todos los tipos de items
    if (isset($processed['description'])) {
        $processed['description_short'] = truncateDescription($processed['description']);
    }
    
    // Agregar el tipo/categoría del item
    if ($category) {
        $processed['type'] = $category;
    }
    
    // Manejo especial para campos de fecha
    if (!isset($processed['add_date'])) {
        if (isset($item['created_at'])) {
            $processed['add_date'] = $item['created_at'];
        } elseif (isset($item['pub_date'])) {
            $processed['add_date'] = $item['pub_date'];
        } else {
            $processed['add_date'] = date('Y-m-d H:i:s');
        }
    }
    
    return $processed;
}
?>
