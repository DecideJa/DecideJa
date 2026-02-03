import { SupabaseService } from './supabase.js';
const supabaseService = new SupabaseService();

supabaseService.getSubareaByCodigo = async function(codigo){
    return this.supabase
        .from('subarea')
        .select('*')
        .eq('codigo', codigo)
        .single();
}

supabaseService.getCursoBySubarea = async function(subareaCodigo){
    return this.supabase
        .from('curso')
        .select('*, subarea: subarea_codigo(nome), grau: grau_codigo(nome)')
        .eq('subarea_codigo', subareaCodigo);
}


function criarCardSubareaPrincipal(subarea){
    return `
        <div id="cardSubareaPrincipal" data-id="${subarea?.codigo}">
                <div id="logoSubareaPrincipal"> <i> </i> </div>
                <div id="nomeSubareaPrincipal"> ${subarea?.nome} </div>         
        </div>
    `;
}

function criarCardCursoSubarea(curso){
    return `
        <div id="cardCursoSubarea" data-id="${curso?.codigo}">
            <div id="topoCardCursoSubarea">
                <div id="logoCurso"> <i> </i> </div>
                <div id="nomeCurso"> ${curso?.nome} </div>
            </div>
            <div id="corpoCardCursoSubarea">
                <div id="descricaoCursoSubarea">
                    <p> ${curso?.nome_completo} </p>
                </div>
                <div id=botaoCardCursoSubarea>
                    <button class="learn-more" id="btnVerMaisCurso"" data-id="${curso?.codigo}">
                        <span class="circle" aria-hidden="true">
                        <span class="icon arrow"></span>
                        </span>
                        <span class="button-text">Ver Curso</span>
                    </button>  
                </div> 
            </div>
        </div>
    `;
}

async function renderCardSubareaPrincipal(codigo){
    const container = document.getElementById("card-detalhe");
    let html;

    if (!codigo) {
       if (container) container.innerHTML = '<p style="color:#092e5e;">Nenhuma subárea selecionada.</p>';
      return;
    }

    if (!container) {
        console.warn('Elemento #card-detalhe não encontrado no DOM.');
        return;
    }
    container.innerHTML = '<p style="color:#092e5e;font-size:1.2em;">Carregando...</p>';

    try{
        const {data: dataSubarea, error: errSubarea} = await supabaseService.getSubareaByCodigo(codigo);
            if (errSubarea) {
                console.error(errSubarea);
                container.innerHTML = '<p style="color:#c0392b;">Erro ao carregar a Subárea.</p>';
                return;
            }

            if (!dataSubarea) {
                container.innerHTML = '<p style="color:#092e5e;">Subárea não encontrada.</p>';
                return;
            }

        container.innerHTML = criarCardSubareaPrincipal(dataSubarea);

        const {data: dataCurso, error: errCurso} = await supabaseService.getCursoBySubarea(codigo);
        
		// Fetch curso for this subarea
		
        html = container.innerHTML
		html += `<div id="divCursoSubareaTitulo">
                    <h4 id="cursoSubareaTitulo">Cursos:</h4>
				    <p id="cursoSubareaSubtitulo">Conheça os diferentes Cursos dessa Subárea</p>
				</div>`;

		if (errCurso) {
			console.error('Erro ao buscar subárea:', errCurso);
			html += `<p style="color:#c0392b;">Erro ao carregar subárea.</p>`;
		} else if (!dataCurso || (Array.isArray(dataCurso) && dataCurso.length === 0)) {
			html += `<p style="color:#092e5e;">Nenhuma subárea encontrada para esta área.</p>`;
		} else {
            html += '<div id="todosCardCursoSubarea">'
			html += '<div id="cursoSubarea-list">';
			(Array.isArray(dataCurso) ? dataCurso : [dataCurso]).forEach(curso => {
                html += criarCardCursoSubarea(curso); // passa o objeto correto
            });
			html += '</div>';
            html += '</div>'
		}   

		container.innerHTML = html;

    }catch(errSubarea){
        console.error(errSubarea);
        container.innerHTML = "Subárea não encontrada."
    }
}

function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

document.addEventListener('DOMContentLoaded', function () {
    const codigo = getQueryParam('codigo');
    const container = document.getElementById('card-detalhe');

    if (!codigo) {
        if (container) container.innerHTML = `<p style="color:#092e5e;">Nenhuma subárea selecionada.</p>`;
        return;
    }

    renderCardSubareaPrincipal(codigo);
});

document.addEventListener("click", function (e) {
    if (e.target.closest("#btnVerMaisCurso")) {
        const card = e.target.closest("#btnVerMaisCurso");
        const cursoId = card.getAttribute("data-id");
        // Redirect to the university details page with the codigo as query parameter
        if (cursoId) {
            window.location.href = `subarea.html?codigo=${encodeURIComponent(cursoId)}`;
        }
    }
    const btn = e.target.closest("#btnVerMaisCurso");
    if (!btn) return;
    const cursoId = btn.getAttribute("data-id") || btn.dataset.id;
    if (cursoId) {
        window.location.href = `curso.html?codigo=${encodeURIComponent(cursoId)}`;
    }
});