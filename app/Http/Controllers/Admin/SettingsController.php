<?php

namespace App\Http\Controllers\Admin;

use App\Models\Settings;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function update(Request $request)
    {
        $validated = $request->validate([
            // ... existing validation rules ...
            'operating_days' => 'nullable|array',
            'operating_days.*' => 'in:Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday',
        ]);

        $settings = Settings::first();
        $settings->update([
            // ... existing fields ...
            'operating_days' => $validated['operating_days'] ?? [],
        ]);

        return redirect()->back()->with('success', 'Settings updated successfully');
    }
} 