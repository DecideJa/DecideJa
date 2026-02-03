import { SupabaseService } from './supabase.js';

const supabaseService = new SupabaseService();

const formNovaSenha = document.getElementById('form-nova-senha');
const novaSenhaInput = document.getElementById('nova-senha');
const confirmarSenhaInput = document.getElementById('confirmar-senha');
const messageContainer = document.getElementById('message-container');

formNovaSenha.addEventListener('submit', async (event) => {
    event.preventDefault();

    const novaSenha = novaSenhaInput.value;
    const confirmarSenha = confirmarSenhaInput.value;

    messageContainer.textContent = '';
    messageContainer.className = '';

    // 1. Validação das senhas
    if (novaSenha.length < 6) {
        showMessage('A senha deve ter pelo menos 6 caracteres.', 'error');
        return;
    }

    if (novaSenha !== confirmarSenha) {
        showMessage('As senhas não coincidem.', 'error');
        return;
    }

    // 2. Atualizar a senha do usuário
    // O Supabase já sabe qual usuário está logado via o link do e-mail.
    const { data, error } = await supabaseService.supabase.auth.updateUser({
        password: novaSenha,
    });

    if (error) {
        console.error("Erro ao atualizar senha:", error.message);
        showMessage('Ocorreu um erro ao atualizar sua senha. Tente novamente.', 'error');
    } else {
        showMessage('Senha atualizada com sucesso! Redirecionando...', 'success');
        // Limpa o formulário
        formNovaSenha.reset();
        // Redireciona para a página de login após 2 segundos
        setTimeout(() => {
            window.location.href = 'index.html'; // <-- SUA PÁGINA DE LOGIN
        }, 2000);
    }
});

function showMessage(text, type) {
    messageContainer.textContent = text;
    messageContainer.className = `message ${type}`;
}