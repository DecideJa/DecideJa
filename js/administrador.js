import {supabaseService} from '../js/supabase';

const supabaseService = new SupabaseService();

let tbArea  = document.getElementById("area");
let tbSubarea = document.getElementById("subarea");
let tbCampus = document.getElementById("campus");
let tbCursos = document.getElementById("cursos");
let tbCampCursos = document.getElementById("cursoCampus");
let tbGrau = document.getElementById("grau");
let tbOrgAcad = document.getElementById("orgAcademica");
let tbUf = document.getElementById("uf");
let tbUni = document.getElementById("universidade");

let subareaArea = document.getElementById("subareaArea");



function pegarDados(){

    let query = supabaseService.getSubarea();

    for(let i = 0; i < query.catch('id'); i++){

        subareaArea.innerHTML = '<option value="' + query.when('id = ' + i) + '"> <option>';

    }
    
}

pegarDados();