<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('app');
});

Route::get('/face-recognition', function () {
    return view('face-recognition');
});
