import {supabase} from './supabase';


document.addEventListener("DOMContentLoaded", function () {
    // Olho senha
    const olho = document.getElementById("olho");
    const senhaInput = document.getElementById("senha");

    if (olho && senhaInput) {
        olho.addEventListener("click", function () {
            if (senhaInput.type === "password") {
                senhaInput.type = "text";
                olho.classList.remove("fa-eye");
                olho.classList.add("fa-eye-slash");
            } else {
                senhaInput.type = "password";
                olho.classList.remove("fa-eye-slash");
                olho.classList.add("fa-eye");
            }
        });
    }

    // Campos do formulário
    const form = document.getElementById("login");
    const nome = document.getElementById("nome");
    const email = document.getElementById("email");
    const tipoEstudante = document.querySelectorAll('input[name="tipo"]');
    const progressBar = document.getElementById("progressBar");

    // Regex para email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Função para atualizar barra de progresso
    function updateProgress() {
        let filled = 0;
        if (nome.value.trim().length > 2) filled++;
        if (emailRegex.test(email.value.trim())) filled++;
        if (senhaInput.value.trim().length >= 6) filled++;
        if ([...tipoEstudante].some(radio => radio.checked)) filled++;
        progressBar.style.width = (filled * 25) + "%";
    }

    // Função para remover bordas vermelhas
    function clearBorders() {
        nome.style.border = "";
        email.style.border = "";
        senhaInput.style.border = "";
        tipoEstudante.forEach(radio => {
            radio.parentElement.style.border = "";
        });
    }

    // Validação ao enviar
    form.addEventListener("submit", function (e) {
        e.preventDefault();
        clearBorders();

        let valid = true;

        // Nome
        if (nome.value.trim().length < 3) {
            nome.style.border = "2px solid red";
            valid = false;
        }

        // Email
        if (!emailRegex.test(email.value.trim())) {
            email.style.border = "2px solid red";
            valid = false;
        }

        // Senha
        if (senhaInput.value.trim().length < 6) {
            senhaInput.style.border = "2px solid red";
            valid = false;
        }

        // Tipo estudante
        if (![...tipoEstudante].some(radio => radio.checked)) {
            tipoEstudante.forEach(radio => {
                radio.parentElement.style.border = "2px solid red";
            });
            valid = false;
        }

        if (valid) {
            window.location.href = "login.html";
        }
    });

    // Eventos para atualizar barra de progresso
    nome.addEventListener("input", updateProgress);
    email.addEventListener("input", updateProgress);
    senhaInput.addEventListener("input", updateProgress);
    tipoEstudante.forEach(radio => radio.addEventListener("change", updateProgress));

    // Atualiza ao carregar
    updateProgress();
});