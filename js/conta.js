import { SupabaseService } from './supabase.js';

const supabaseService = new SupabaseService();

document.addEventListener('DOMContentLoaded', async () => {
    // Pega usuário atual via Auth (getUser retorna { data: { user } })
    const { data, error } = await supabaseService.supabase.auth.getUser();
    if (error) {
        console.error('Erro ao obter usuário:', error);
        alert('Erro ao obter dados do usuário. Faça login ou crie uma conta.');
        window.location.href = 'login.html';
        return;
    }

    const user = data?.user;
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    const metadata = user.user_metadata || {};

    async function getFotoDefault(pathRelative) {
        // pathRelative: caminho dentro do bucket "usuario", ex: "avataresDefault/padrao.png"
        const { data: dadosStorage, error: errStorage } = await supabaseService.supabase.storage
            .from('usuario')
            .getPublicUrl(pathRelative);

        if (errStorage) {
            console.error('Erro getPublicUrl:', errStorage);
            return null;
        }
        return dadosStorage?.publicUrl || null;
    }

    async function criaDivFotoUsuario() {
        const src = await getFotoDefault('avataresDefault/padrao.png') || '';
        const html = `
            <div id="divFotoUsuario"> 
                    <img class="semImg" id="fotoDefault" src="${src}" alt="Foto do usuário">   
            </div>`;
        return html;
    }

    async function criaCardUsuarioDados() {
        const usuarioTemUniversidade = metadata?.universidade ? `
            <div id="universidadeUsuario">
                <h4 class="labelDados" id="labelUniversidade">Universidade:</h4>
                <h2>${metadata.universidade}</h2>
            </div>` : '';

        const html = `
        <div id="cardUsuarioDados" data-id="${user.id}">
            <div id="topoCardUsuario">
                <div id="textoTopoCardUsuario">
                    <i class="fa-regular fa-user"></i> 
                    <h2 id="textoInfoPessoais">Informações Pessoais: </h2>
                </div>
            </div>
            <div id="corpoCardUsuario">
                <div id="dados-list">
                    <div class="divDados" id="nomeUsuario">
                        <h4 class="labelDados" id="labelNome">Nome Completo:</h4>
                        <h5 class="textoRespostaLabel">${metadata.nome || ''}</h5>
                    </div>
                    <div class="divDados" id="emailUsuario">
                        <h4 class="labelDados" id="labelEmail">Email:</h4>
                        <h5 class="textoRespostaLabel">${user.email || ''}</h5>
                    </div>
                    <div class="divDados" id="tipoUsuario">
                        <h4 class="labelDados" id="labelTipo">Tipo do Usuário:</h4>
                        <h5 class="textoRespostaLabel">${metadata.tipo || ''}</h5>
                    </div>
                    ${usuarioTemUniversidade}
                </div>
            </div>
        </div>`;
        return html;
    }

    async function criaCardConta() {
        const fotoHtml = await criaDivFotoUsuario();
        const dadosHtml = await criaCardUsuarioDados();

        const html = `
        <div id="cardConta" data-id="${user?.id}">
            <div id="topoCardConta">
                ${fotoHtml}
                <div id="divTextoBoasVindas">
                    <h1 id="textoNome">Olá, ${metadata?.nome}!</h1>
                </div>
            </div>
            <div id="corpoCardConta">
                ${dadosHtml}
            </div>
        </div>`;
        return html;
    }

    async function renderCardConta() {
        const container = document.getElementById('card-detalhe');
        if (!container) {
            console.warn('Elemento #card-detalhe não encontrado no DOM.');
            return;
        }
        container.innerHTML = '<p style="color:#092e5e;font-size:1.2em;">Carregando...</p>';
        const html = await criaCardConta();
        container.innerHTML = html;
    }

    await renderCardConta();

    // Ex.: botão de logout com id="btnLogout"
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async (e) => {
            e.preventDefault();
            await supabaseService.supabase.auth.signOut();
            window.location.href = 'login.html';
        });
    }
});
