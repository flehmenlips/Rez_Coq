@extends('layouts.admin')

@section('content')
    <form method="POST" action="{{ route('admin.settings.update') }}">
        @csrf
        @method('PUT')
        
        // ... other settings ...
        
        <div class="mt-4">
            <h3 class="text-lg font-medium">Operating Days</h3>
            <div class="mt-2 space-y-2">
                @foreach(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as $day)
                    <label class="inline-flex items-center">
                        <input type="checkbox" 
                               name="operating_days[]" 
                               value="{{ $day }}"
                               {{ in_array($day, old('operating_days', $settings->operating_days ?? [])) ? 'checked' : '' }}
                               class="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
                        <span class="ml-2">{{ $day }}</span>
                    </label>
                @endforeach
            </div>
        </div>

        <div class="mt-4">
            <button type="submit" class="btn btn-primary">
                Save Settings
            </button>
        </div>
    </form>
@endsection 