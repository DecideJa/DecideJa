import { SupabaseService } from './supabase.js';

const supabaseService = new SupabaseService();

// guarda id do usuário auth e nome (preenchidos em getUsuarioLogado)
let usuarioId = null;
let nome = null;

async function getUsuarioLogado() {
    try {
        const { data: { user }, error: authErr } = await supabaseService.supabase.auth.getUser();
        if (authErr) {
            console.warn('getUsuarioLogado: erro ao chamar auth.getUser', authErr);
            return null;
        }
        if (!user) return null;

        usuarioId = user.id || null;
        const email = user.email || '';
        const metadata = user.user_metadata || {};
        const nomeFromMeta = metadata.nome || email.split('@')[0];
        const tipo = metadata.tipo || '';
        const universidade = metadata.universidade || '';

        nome = nomeFromMeta;

        return { codigo: null, id: usuarioId, nome, email, tipo, universidade };
    } catch (err) {
        console.error('getUsuarioLogado error', err);
        return null;
    }
}

/**
 * Retorna o campo de referência correto conforme o tipo de comentário.
 * @param {string} tipo - Tipo de página (universidade, campus, curso, cursoCampus)
 * @param {number} referencia - Código da entidade
 */
function buildRefField(tipo, referencia) {
    if (tipo === 'curso' || tipo === 'cursoCampus') return { refCurso: Number(referencia) };
    if (tipo === 'campus') return { refCampus: Number(referencia) };
    // fallback para compatibilidade antiga
    return { referencia: Number(referencia) };
}

export async function adicionarComentario(tipo, referencia, texto) {
    if (!texto || !texto.trim()) return alert('Digite um comentário antes de enviar.');

    const dataAtual = new Date().toISOString().split('T')[0];
    const usuario = await getUsuarioLogado();

    const refField = buildRefField(tipo, referencia);

    const novoComentario = Object.assign({
        texto: texto.trim(),
        data: dataAtual,
        codigo_usuario: usuario && usuario.codigo ? usuario.codigo : null
    }, refField);

    try {
        const { data, error } = await supabaseService.supabase
            .from('comentario')
            .insert([novoComentario])
            .select();

        if (error) throw error;

        // Mostrar mensagem de sucesso ao usuário (apenas se salvo no banco)
        showComentarioMensagem('Comentário enviado com sucesso! Obrigado por compartilhar sua experiência com os demais usuários!', 'success');

        const highlight = { texto: novoComentario.texto, data: novoComentario.data, nome: usuario ? usuario.nome : null };

        await carregarComentarios(tipo, referencia, highlight);
        return data;
    } catch (err) {
        console.error('Erro ao adicionar comentário:', err);
        // Mostrar mensagem de erro amigável
        showComentarioMensagem('Erro ao enviar comentário. Por favor, tente novamente.', 'error');
        throw err;
    }
}

// Exibe uma mensagem temporária de sucesso/erro relacionada a comentários
function showComentarioMensagem(texto, tipo = 'success') {
    // remove toast anterior se existir
    const existing = document.getElementById('comentario-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'comentario-toast';
    toast.setAttribute('role', 'status');
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.padding = '12px 14px';
    toast.style.borderRadius = '8px';
    toast.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
    toast.style.maxWidth = '350px';
    toast.style.zIndex = '9999';
    toast.style.cursor = 'pointer';
    toast.style.fontFamily = 'Inter, sans-serif';
    toast.style.fontSize = '0.95em';
    if (tipo === 'success') {
        toast.style.backgroundColor = '#e6ffed';
        toast.style.border = '1px solid #3bb54a22';
        toast.style.color = '#064a1a';
    } else {
        toast.style.backgroundColor = '#ffe6e6';
        toast.style.border = '1px solid #b53b3b22';
        toast.style.color = '#581111';
    }

    // icon
    const icon = document.createElement('span');
    icon.style.marginRight = '10px';
    icon.style.fontWeight = '700';
    icon.textContent = tipo === 'success' ? '✓' : '⚠';

    const textNode = document.createElement('span');
    textNode.textContent = texto;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Fechar');
    closeBtn.style.marginLeft = '10px';
    closeBtn.style.background = 'transparent';
    closeBtn.style.border = 'none';
    closeBtn.style.color = 'inherit';
    closeBtn.style.fontSize = '1.1em';
    closeBtn.style.cursor = 'pointer';
    closeBtn.textContent = '✕';

    toast.appendChild(icon);
    toast.appendChild(textNode);
    toast.appendChild(closeBtn);

    // inserir no body para aparecer no canto inferior direito
    document.body.appendChild(toast);

    // fechar ao clicar no botão ou no próprio toast
    const remover = () => toast.remove();
    closeBtn.addEventListener('click', remover);
    toast.addEventListener('click', (e) => {
        // se clicar no próprio toast (exceto no botão), fecha também
        if (e.target !== closeBtn) remover();
    });

    // desaparecer automaticamente após 5 segundos
    setTimeout(() => {
        if (document.getElementById('comentario-toast')) remover();
    }, 5000);
}

// ---- Curtidas ----
async function incrementarCurtida(comentarioCodigo) {
    try {
        const id = Number(comentarioCodigo);
        const { data: row, error: selErr } = await supabaseService.supabase
            .from('comentario')
            .select('curtidas')
            .eq('codigo', id)
            .single();

        if (selErr) throw selErr;

        const nova = (row?.curtidas || 0) + 1;
        const { data: updated, error: updErr } = await supabaseService.supabase
            .from('comentario')
            .update({ curtidas: nova })
            .eq('codigo', id)
            .select('curtidas');

        if (updErr) throw updErr;

        const valor = Array.isArray(updated) ? (updated[0]?.curtidas ?? nova) : (updated?.curtidas ?? nova);
        return valor;
    } catch (err) {
        console.error('incrementarCurtida error', err);
        throw err;
    }
}

async function decrementarCurtida(comentarioCodigo) {
    try {
        const id = Number(comentarioCodigo);
        const { data: row, error: selErr } = await supabaseService.supabase
            .from('comentario')
            .select('curtidas')
            .eq('codigo', id)
            .single();

        if (selErr) throw selErr;

        const nova = Math.max(0, (row?.curtidas || 0) - 1);
        const { data: updated, error: updErr } = await supabaseService.supabase
            .from('comentario')
            .update({ curtidas: nova })
            .eq('codigo', id)
            .select('curtidas');

        if (updErr) throw updErr;

        const valor = Array.isArray(updated) ? (updated[0]?.curtidas ?? nova) : (updated?.curtidas ?? nova);
        return valor;
    } catch (err) {
        console.error('decrementarCurtida error', err);
        throw err;
    }
}

export async function carregarComentarios(tipo, referencia, highlight = null) {
    const container = document.getElementById('comentariosContainer');
    if (!container) return;
    container.innerHTML = '<p>Carregando comentários...</p>';

    try {
        await getUsuarioLogado();

        let fieldName;
        if (tipo === 'curso' || tipo === 'cursoCampus') fieldName = 'refCurso';
        else if (tipo === 'campus') fieldName = 'refCampus';
        else fieldName = 'referencia';

        const { data: comentariosData, error: comentariosError } = await supabaseService.supabase
            .from('comentario')
            .select('*')
            .eq(fieldName, Number(referencia))
            .order('data', { ascending: false });

        if (comentariosError) {
            console.error('Erro ao carregar comentários:', comentariosError);
            container.innerHTML = '<p>Erro ao carregar comentários.</p>';
            return;
        }

        const comentarios = Array.isArray(comentariosData) ? comentariosData : [];

        const userIds = [...new Set(comentarios.map(c => c.codigo_usuario).filter(Boolean))];
        const usersMap = {};
        if (userIds.length > 0) {
            try {
                const { data: usuarios, error: usuariosError } = await supabaseService.supabase
                    .from('usuario')
                    .select('codigo, nome')
                    .in('codigo', userIds);

                if (!usuariosError && Array.isArray(usuarios)) {
                    usuarios.forEach(u => { usersMap[u.codigo] = u.nome; });
                }
            } catch (e) {
                console.warn('Falha ao buscar usuários:', e);
            }
        }

        comentarios.forEach(c => {
            c.nome_usuario = usersMap[c.codigo_usuario] || null;

            if (!c.nome_usuario && highlight && highlight.nome) {
                if (String(c.texto) === String(highlight.texto) && String(c.data) === String(highlight.data)) {
                    c.nome_usuario = highlight.nome;
                }
            }

            if (!c.nome_usuario) c.nome_usuario = nome || null;
            c.ja_curtiu = Boolean(localStorage.getItem(`curtiu_${c.codigo}`));
        });

        renderizarComentarios(comentarios);
    } catch (err) {
        console.error('Erro inesperado ao carregar comentários:', err);
        container.innerHTML = '<p>Erro ao carregar comentários.</p>';
    }
}

function renderizarComentarios(lista) {
    const container = document.getElementById('comentariosContainer');
    if (!container) return;

    container.innerHTML = '';

    if (!Array.isArray(lista) || lista.length === 0) {
        container.innerHTML = '<p id=comentarioSubtitulo>Seja o primeiro a comentar!</p>';
        return;
    }

    lista.forEach(c => {
        const texto = c?.texto ?? '';
        const dataStr = c?.data ? new Date(c.data).toLocaleDateString('pt-BR') : '';
        const nomeDoAutor = c?.nome_usuario || 'Anônimo';
        const curtidas = Number(c?.curtidas || 0);
        const jaCurtiu = Boolean(c?.ja_curtiu);

        const div = document.createElement('div');
        div.className = 'comentario-box';
        div.innerHTML = `
        <div class="comentario">
            <div class="comentario-topo">
                <i id="perfilComentario" class="fa-solid fa-user"></i>
                <div id="infoComentario">
                    <strong style="font-size:1.1rem;">${escapeHtml(nomeDoAutor)}</strong>
                    <span class="dataComentario">${dataStr}</span>
                </div>
            </div>
            <div class="comentario-texto" style="margin-top:6px;">${escapeHtml(texto)}</div>
            <div class="comentario-counter" style="margin-top:10px;">
                <button class="btn-counter" data-id="${c.codigo}" data-liked="${jaCurtiu}" type="button" style="border-radius:8px; padding:6px 10px; display:flex; align-items:center; justify-content:center; gap:6px; font-size:0.85rem;">
                    <i class="fa-solid fa-thumbs-up" aria-hidden="true" style="color:#092e5e;"></i>
                    <span class="contador">${curtidas}</span>
                </button>
            </div>
        </div>
        `;
        container.appendChild(div);

        const btn = div.querySelector('.btn-counter');
        if (!btn) return;

        const updateButtonStyle = () => {
            if (btn.dataset.liked === 'true') {
                btn.style.opacity = '0.7';
                btn.style.cursor = 'pointer';
            } else {
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            }
        };

        updateButtonStyle();

        btn.addEventListener('click', async () => {
            const isLiked = btn.dataset.liked === 'true';
            const codigo = btn.dataset.id;
            
            try {
                if (isLiked) {
                    // Unlike: remover curtida
                    const novaQtd = await decrementarCurtida(codigo);
                    localStorage.removeItem(`curtiu_${codigo}`);
                    btn.dataset.liked = 'false';
                    const span = btn.querySelector('.contador');
                    if (span) span.textContent = String(novaQtd ?? (Number(span.textContent || 0) - 1));
                } else {
                    // Like: adicionar curtida
                    const novaQtd = await incrementarCurtida(codigo);
                    localStorage.setItem(`curtiu_${codigo}`, '1');
                    btn.dataset.liked = 'true';
                    const span = btn.querySelector('.contador');
                    if (span) span.textContent = String(novaQtd ?? (Number(span.textContent || 0) + 1));
                }
                updateButtonStyle();
            } catch (e) {
                console.error('Erro ao atualizar curtida:', e);
                alert(isLiked ? 'Erro ao remover curtida.' : 'Erro ao curtir comentário.');
            }
        });
    });
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export function inicializarComentarios(referencia, tipo = 'universidade') {
    const btnEnviar = document.getElementById('btnEnviarComentario');
    const txtComentario = document.getElementById('comentarioTexto');

    if (!btnEnviar || !txtComentario) return;

    const novoBtn = btnEnviar.cloneNode(true);
    btnEnviar.parentNode.replaceChild(novoBtn, btnEnviar);

    novoBtn.addEventListener('click', async () => {
        const texto = txtComentario.value.trim();
        if (!texto) return alert('Digite um comentário antes de enviar.');
        if (!referencia) return alert('Referência da universidade/campus não informada.');

        try {
            await adicionarComentario(tipo, referencia, texto);
            txtComentario.value = '';
            await carregarComentarios(tipo, referencia);
        } catch (err) {
            alert('Erro ao enviar comentário.');
            console.error(err);
        }
    });
}
