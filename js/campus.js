import { SupabaseService } from './supabase.js';
import { inicializarComentarios, carregarComentarios, adicionarComentario } from './comentarios.js';

// --- Main Execution Logic ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Get Campus ID from URL
    const getQueryParam = (name) => new URLSearchParams(window.location.search).get(name);
    const campusIdStr = getQueryParam('codigo');
    const campusId = campusIdStr ? Number(campusIdStr) : null;

    const container = document.getElementById('card-detalhe');

    // 2. Validate Campus ID
    if (!campusId) {
        if (container) container.innerHTML = `<p style="color:#092e5e;">Nenhum campus selecionado.</p>`;
        console.warn('campus.js: ID do campus (param "codigo") não encontrado na URL.');
        return;
    }

    // 3. Render main campus content
    await renderCampus(campusId, container);

    // 4. Initialize and load comments system
    try {
        // This sets up the "send" button for comments
        inicializarComentarios(campusId, 'campus'); 
        // This loads existing comments
        await carregarComentarios('campus', campusId);
    } catch (e) {
        console.error('Erro ao inicializar ou carregar sistema de comentários:', e);
    }

    // 5. Setup "Leave a Review" button to show the comment box
    const btnAvaliar = document.getElementById('btnAvaliar');
    const box = document.getElementById('box');
    if (btnAvaliar && box) {
        btnAvaliar.addEventListener('click', () => {
            box.style.display = 'flex';
            const textarea = document.getElementById('comentarioTexto');
            if (textarea) {
                textarea.focus();
                textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    }

    // 6. Setup "Close" button for the comment box
    const fechar = document.getElementById('fechar');
    if (fechar && box) {
        fechar.addEventListener('click', () => {
            box.style.display = 'none';
        });
    }
});


// --- Data Fetching and Rendering ---

const supabaseService = new SupabaseService();

supabaseService.getCampusByCodigo = async function (codigo) {
    return this.supabase
        .from('campus')
        .select(`*, municipio:municipio_codigo (nome), universidade:universidade_codigo (nome, sigla)`)
        .eq('codigo', codigo)
        .single();
};

supabaseService.getCursosByCampus = async function (campusCodigo) {
    const { data: links, error: linksError } = await this.supabase
        .from('campus_has_curso')
        .select('curso_codigo')
        .eq('campus_codigo', campusCodigo);

    if (linksError) return { data: null, error: linksError };
    if (!links || links.length === 0) return { data: [], error: null };

    const cursoIds = Array.from(new Set(links.map(l => l.curso_codigo)));

    return this.supabase
        .from('curso')
        .select('*, subarea:subarea_codigo (nome, area:area_codigo (nome)), grau:grau_codigo (nome)')
        .in('codigo', cursoIds);
};

async function renderCampus(codigo, container) {
    if (!container) return;
    container.innerHTML = '<p style="color:#092e5e;font-size:1.2em;">Carregando...</p>';

    try {
        const { data: campus, error } = await supabaseService.getCampusByCodigo(codigo);

        if (error) {
            console.error('Erro ao buscar campus:', error);
            container.innerHTML = `<p style="color:#c0392b;">Erro ao carregar campus.</p>`;
            return;
        }

        if (!campus) {
            container.innerHTML = `<p style="color:#092e5e;">Campus não encontrado.</p>`;
            return;
        }

        container.innerHTML = criarCardCampus(campus);
        container.innerHTML += `<div id="divcampusTitulo"><h4 id="campustitulo">Infraestrutura</h4><p id="campusSubtitulo">Conheça as facilidades disponíveis:</p></div>`;
        container.innerHTML += criarCardInfraestrutura();
        container.innerHTML += `<div id="divcampusTitulo"><h4 id="campustitulo">Cursos Oferecidos</h4><p id="campusSubtitulo">Explore os cursos disponíveis neste campus:</p></div>`;

        const { data: cursos, error: cursosError } = await supabaseService.getCursosByCampus(codigo);

        if (cursosError) {
            console.error('Error fetching courses:', cursosError);
            container.innerHTML += `<p style="color:#c0392b;">Erro ao carregar cursos.</p>`;
        } else if (!cursos || cursos.length === 0) {
            container.innerHTML += `<p style="color:#092e5e;">Cursos não encontrados para este campus.</p>`;
        } else {
            let cursosHtml = `<div id="cursos-list" class="lista-cursos" data-campus-id="${codigo}">`;
            cursos.forEach(curso => {
                cursosHtml += criarCardCurso(curso);
            });
            cursosHtml += '</div>';
            container.innerHTML += cursosHtml;
        }

    } catch (err) {
        console.error(err);
        container.innerHTML = `<p style="color:#c0392b;">Erro Inesperado.</p>`;
    }
}


// --- HTML Card Creation Functions ---

function criarCardCampus(campus) {
    const nomeCampus = campus?.nome?.includes(" - ")
        ? campus.nome.split(" - ")[1]
        : campus?.nome;

    return `
    <div class="cardcampus" data-id="${campus?.codigo}">
      <div id="topoCardCampus">

        <div id="iconeCardCampus"><i class="fa-solid fa-building"></i></div>
        <div id="infoCampus">
        <div id="nomeCampus">

            <div><h1>${nomeCampus || 'Nome do campus'}<h1></div>

            <div id="nomeUni">${campus?.universidade?.nome || '-'}</div>
           
        </div>
            <div id="stars">
						<!-- From Uiverse.io by andrew-demchenk0 --> 
						<div class="rating">
 						 <input value="5" name="rate" id="star5" type="radio">
  						<label title="text" for="star5"></label>
 						 <input value="4" name="rate" id="star4" type="radio">
  						<label title="text" for="star4"></label>
 						 <input value="3" name="rate" id="star3" type="radio" checked="">
  						<label title="text" for="star3"></label>
  						<input value="2" name="rate" id="star2" type="radio">
  						<label title="text" for="star2"></label>
  						<input value="1" name="rate" id="star1" type="radio">
  						<label title="text" for="star1"></label>
						</div>

						<div>
						<p id="avaliacaomedia">4.6</p>
						</div>

						<a href="#topocomentarios"><button class="button">
  							<span class="button-content">Avaliar </span>
						</button></a>
					</div>

        </div>
      </div>

      <div id="detalhesCardCampus">
       
        <div id="localCampus">
            <i id="icone" class="fa-solid fa-location-dot"></i>

            <div class="colunaDadosCampus">
                <span class="subtitulo">Localização:</span>
                <span class="dadoCampus">${campus?.municipio?.nome || '-'}</span>
            </div>

         </div>

         <div id="localCampus">
            <i id="icone" class="fa-solid fa-map-location-dot"></i>

            <div class="colunaDadosCampus">
                <span class="subtitulo">Endereço:</span>
                <span class="dadoCampus">Rua  Botucatu, 740 </span>
            </div>

         </div>

         <div id="localCampus">
            <i id="icone" class="fa-solid fa-medal"></i>

            <div class="colunaDadosCampus">
                <span class="subtitulo" >Nota IGC:</span>
                <span class="dadoCampus">Conceito 5</span>
            </div>

         </div>

         <div id="localCampus">
            <i id="icone" class="fa-solid fa-user"></i>

            <div class="colunaDadosCampus">
                <span class="subtitulo">Estudantes:</span>
                <span class="dadoCampus">1.200</span>
            </div>

         </div>

      </div>
    </div>
  `;
}

function criarCardInfraestrutura() {
    return `
    <div id="containerInfraestrutura">
        <div class="cardInfraestrutura">
            <div class="iconeInfra"><i class="fa-solid fa-book"></i></div>
             <div class="tituloCardInfra"><span>Biblioteca</span></div>
              <div class="infoCardInfra"><span>Acervo com mais de 50 mil livros</span></div>
        </div>

        <div class="cardInfraestrutura">
            <div class="iconeInfra"><i class="fa-solid fa-computer"></i></div>
             <div class="tituloCardInfra"><span>Laboratórios</span></div>
              <div class="infoCardInfra"><span>15 laboratórios modernos</span></div>
        </div>

        <div class="cardInfraestrutura">
            <div class="iconeInfra"><i class="fa-solid fa-wifi"></i></div>
             <div class="tituloCardInfra"><span>Wi-Fi</span></div>
              <div class="infoCardInfra"><span>Internet de alta velocidade</span></div>
        </div>

        <div class="cardInfraestrutura">
            <div class="iconeInfra"><i class="fa-solid fa-magnifying-glass"></i></div>
             <div class="tituloCardInfra"><span>Projetos de Pesquisa</span></div>
              <div class="infoCardInfra"><span>Mais de 20 projetos de pesquisa</span></div>
        </div>
    </div>
    `;
}

function criarCardCurso(curso) {
    const areaNome = curso?.subarea?.area?.nome || '';
    const subareaNome = curso?.subarea?.nome || '';
    const grauNome = curso?.grau?.nome || '';

    return `
        <div class="cardcurso" data-id="${curso?.codigo}">
            <div class="cardcurso-header">
                <div class="cardcurso-title">${curso?.nome || curso?.nome_completo || 'Nome do Curso'}</div>
                <div class="cardcurso-bookmark"><i class="fa-solid fa-graduation-cap"></i></div>
            </div>

            <div class="cardcurso-body">
                ${areaNome ? `<div class="cardcurso-row"><span class="cardcurso-label">Area:</span> <span class="cardcurso-value">${areaNome}</span></div>` : ''}
                ${subareaNome ? `<div class="cardcurso-row"><span class="cardcurso-label">Subarea:</span> <span class="cardcurso-value">${subareaNome}</span></div>` : ''}

                <div class="cardcurso-tags">
                    ${grauNome ? `<span class="tag tag-grau">${grauNome}</span>` : ''}
                </div>
            </div>
        </div>
    `;
}

// --- Global Click Listeners ---

// This listener handles clicks on course cards to navigate to the course page
document.addEventListener("click", function (e) {
    // Check if a course card was clicked
    const card = e.target.closest(".cardcurso");
    if (card) {
        const cursoId = card.getAttribute("data-id");
        const cursosList = card.closest("#cursos-list");
        const campusId = cursosList ? cursosList.getAttribute("data-campus-id") : null;
        
        if (cursoId && campusId) {
            window.location.href = `cursoCampus.html?campus=${encodeURIComponent(campusId)}&curso=${encodeURIComponent(cursoId)}`;
        } else if (cursoId) {
            // Fallback if campusId isn't found on the list container, using 'codigo' for the curso.
            window.location.href = `cursoCampus.html?codigo=${encodeURIComponent(cursoId)}`;
        }
    }
});
