protected $casts = [
    // ... existing casts ...
    'operating_days' => 'array',
]; 

use App\Models\Settings;

if (!Settings::first()) {
    Settings::create([
        'operating_days' => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    ]);
} 