import { SupabaseService } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    // Verifica o hash da URL para mostrar a tela correta
    if (window.location.hash === '#registerScreen') {
        showScreen('registerScreen');
    } else {
        showScreen('loginScreen');
    }
});

// Função para mostrar uma tela específica
function showScreen(screenId) {
    // Esconde todas as telas com transição suave
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    // Mostra a tela selecionada após um pequeno delay para transição
    setTimeout(() => {
        document.getElementById(screenId).classList.add('active');
    }, 150);

    // Reset dos campos extras ao mudar para a tela de registro
    if (screenId === 'registerScreen') {
        setTimeout(() => resetTypeSelection(screenId), 200);
    }
}

// Função para resetar seleção de tipo e campos extras (usada principalmente no registro)
function resetTypeSelection(screenId) {
    // Tenta localizar os elementos pelos IDs esperados
    const universidadeField = document.getElementById('universidade-field');
    const universidadeInput = document.getElementById('loginUniversidade');

    // Reseta botões de tipo para o padrão "Interessado"
    const buttons = document.querySelectorAll(`#${screenId} .type-btn`);
    buttons.forEach(btn => btn.classList.remove('active'));
    if (buttons.length > 0) {
        buttons[0].classList.add('active'); // "Interessado" como default
    }

    // Esconde o campo de universidade e remove a obrigatoriedade
    if (universidadeField) {
        universidadeField.classList.remove('active');
    }
    if (universidadeInput) {
        universidadeInput.required = false;
    }
}

// A tela de login não possui mais botões de tipo, então esta seção foi removida.
// Se precisar dela no futuro, os IDs e a lógica precisarão ser recriados.

// Lógica para botões de tipo no Registro
const registerTypeButtons = document.querySelectorAll('#registerScreen .type-btn');
const universidadeField = document.getElementById('universidade-field');
const universidadeInput = document.getElementById('loginUniversidade');

registerTypeButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Remove a classe 'active' de todos os botões
        registerTypeButtons.forEach(btn => btn.classList.remove('active'));
        // Adiciona a classe 'active' no botão clicado
        button.classList.add('active');

        const type = button.dataset.type;

        // Lógica para mostrar/esconder o campo de universidade
        if (type === 'graduando') {
            // Mostra o campo e torna obrigatório
            universidadeField.classList.add('active');
            universidadeInput.required = true;
        } else {
            // Esconde o campo e remove a obrigatoriedade
            universidadeField.classList.remove('active');
            universidadeInput.required = false;
        }
    });
});

// Eventos de submit dos formulários
document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    handleLogin();
});

document.getElementById('registerForm').addEventListener('submit', (e) => {
    e.preventDefault();
    handleRegister();
});

document.getElementById('recoverForm').addEventListener('submit', (e) => {
    e.preventDefault();
    handleRecover();
});

// --- Supabase auth handlers ---
const supabaseService = new SupabaseService();

async function handleLogin() {
    const email = document.getElementById('loginEmail')?.value.trim();
    const senha = document.getElementById('loginSenha')?.value.trim();
    if (!email || !senha) {
        alert('Preencha e-mail e senha.');
        return;
    }

    try {
        const { data, error } = await supabaseService.supabase.auth.signInWithPassword({
            email,
            password: senha,
        });
        if (error) {
            console.error('Erro login:', error);
            alert('Erro no login: ' + (error.message || JSON.stringify(error)));
            return;
        }
        // Sucesso
        window.location.href = 'inicio.html';
    } catch (err) {
        console.error(err);
        alert('Erro inesperado no login. Veja console.');
    }
}

async function handleRegister() {
    const nome = document.getElementById('nome')?.value.trim();
    const email = document.getElementById('registerEmail')?.value.trim();
    const senha = document.getElementById('registerSenha')?.value.trim();
    const confirmSenha = document.getElementById('confirmSenha')?.value.trim();

    // Validação de senha
    if (senha !== confirmSenha) {
        alert('As senhas não coincidem.');
        return;
    }

    const tipoBtn = document.querySelector('#registerScreen .type-btn.active');
    const tipo = tipoBtn ? tipoBtn.dataset.type : 'interessado'; // Pega o tipo do botão ativo

    // CORREÇÃO: ID do campo de universidade foi alterado para 'loginUniversidade'
    const universidade = document.getElementById('loginUniversidade')?.value.trim() || '';

    if (!nome || !email || !senha) {
        alert('Preencha nome, email e senha.');
        return;
    }

    try {
        const { data, error } = await supabaseService.supabase.auth.signUp({
            email,
            password: senha,
            options: {
                data: {
                    nome,
                    tipo,
                    universidade,
                }
            }
        });

        if (error) {
            console.error('Erro registro:', error);
            if (error.message && error.message.includes('already registered')) {
                alert('E-mail já cadastrado. Redirecionando para login.');
                showScreen('loginScreen');
            } else {
                alert('Erro no registro: ' + (error.message || JSON.stringify(error)));
            }
            return;
        }

        alert('Registro efetuado! Verifique seu e-mail se necessário.');
        showScreen('loginScreen');
    } catch (err) {
        console.error(err);
        alert('Erro inesperado no registro. Veja console.');
    }
}

async function handleRecover() {
    const email = document.getElementById('recoverEmail')?.value.trim();
    if (!email) {
        alert('Informe seu e-mail para recuperação.');
        return;
    }
    try {
        const { data, error } = await supabaseService.supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/novaSenha.html' });
        if (error) {
            console.error('Erro recover:', error);
            alert('Erro ao solicitar recuperação: ' + (error.message || JSON.stringify(error)));
            return;
        }
        alert('Email de recuperação enviado. Verifique sua caixa de entrada.');
        showScreen('loginScreen');
    } catch (err) {
        console.error(err);
        alert('Erro inesperado ao recuperar senha.');
    }
}

// Expor funções usadas em atributos inline (onclick) quando o script é carregado como module
window.showScreen = showScreen;

// Toggle para os ícones de olho dentro dos inputs de senha (funciona corretamente com o HTML atual)
document.querySelectorAll('.toggle-eye').forEach(icon => {
    icon.addEventListener('click', () => {
        const targetId = icon.dataset.target;
        const input = document.getElementById(targetId);
        if (!input) return;
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    });
});