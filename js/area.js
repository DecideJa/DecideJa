import { criarCardUniversidade } from './main.js';
import { SupabaseService } from './supabase.js';
const supabaseService = new SupabaseService();

supabaseService.getAreaByCodigo = async function(codigo){
    return this.supabase
        .from('area')
        .select('*')
        .eq('codigo', codigo)
        .single();
}

supabaseService.getSubareaByArea = async function (areaCodigo) {
    return this.supabase
        .from('subarea')
        .select(`*, area: area_codigo(nome)`)
        .eq('area_codigo', areaCodigo)

};

function criarCardAreaPrincipal(area){

    return `
        <div id="cardAreaPrincipal" data-id="${area?.codigo}">
            
                <div id="logoAreaPrincipal"> </div>
                <div id="nomeAreaPrincipal"> ${area?.nome} </div>
           
        </div>
    `

}
function criarCardSubarea(subarea){

    return `
        <div id="cardSubarea" data-id="${subarea?.codigo}">
            <div id="topoCardSubarea">
                <div id="logoSubarea"> <i> </i> </div>
                <div id="nomeSubarea"> ${subarea?.nome} </div>
            </div>
            <div id="corpoCardSubarea">
                <p> fazer descrição + tarde </p>
                <div id=botaoCardSubarea>
                    <button class="learn-more" id="btnVerMaisSubarea"" data-id="${subarea?.codigo}">
                        <span class="circle" aria-hidden="true">
                        <span class="icon arrow"></span>
                        </span>
                        <span class="button-text">Ver Subárea</span>
                    </button>  
                </div>       
            </div>
        </div>
    `;

}


async function renderCardAreaPrincipal(codigo){
    const container = document.getElementById("card-detalhe");
    let html;

    if (!codigo) {
       if (container) container.innerHTML = '<p style="color:#092e5e;">Nenhuma área selecionada.</p>';
      return;
    }

    if (!container) {
        console.warn('Elemento #card-detalhe não encontrado no DOM.');
        return;
    }
    container.innerHTML = '<p style="color:#092e5e;font-size:1.2em;">Carregando...</p>';

    try{
        const {data: dataArea, error: errArea} = await supabaseService.getAreaByCodigo(codigo);
            if (errArea) {
                console.error(errArea);
                container.innerHTML = '<p style="color:#c0392b;">Erro ao carregar a área.</p>';
                return;
            }

            if (!dataArea) {
                container.innerHTML = '<p style="color:#092e5e;">Área não encontrada.</p>';
                return;
            }

        container.innerHTML = criarCardAreaPrincipal(dataArea);

        const {data: dataSubarea, error: errSubarea} = await supabaseService.getSubareaByArea(codigo);
        
		// Fetch subarea for this area
		
        html = container.innerHTML
		html += `<div id="divSubareaTitulo">
                    <h4 id="subareaTitulo">Subáreas:</h4>
				    <p id="subareaSubtitulo">Conheça as diferentes subáreas</p>
				</div>`;

		if (errSubarea) {
			console.error('Erro ao buscar subárea:', errSubarea);
			html += `<p style="color:#c0392b;">Erro ao carregar subárea.</p>`;
		} else if (!dataSubarea || (Array.isArray(dataSubarea) && dataSubarea.length === 0)) {
			html += `<p style="color:#092e5e;">Nenhuma subárea encontrada para esta área.</p>`;
		} else {
            html += '<div id="todasCardSubarea">'
			html += '<div id="subarea-list">';
			(Array.isArray(dataSubarea) ? dataSubarea : [dataSubarea]).forEach(subarea => {
                html += criarCardSubarea(subarea); // passa o objeto correto
            });
			html += '</div>';
            html += '</div>'
		}   

		container.innerHTML = html;

    }catch(errArea){
        console.error(errArea);
        container.innerHTML = "Área não encontrada."
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
        if (container) container.innerHTML = `<p style="color:#092e5e;">Nenhuma área selecionada.</p>`;
        return;
    }

    renderCardAreaPrincipal(codigo);
});

  document.addEventListener("click", function (e) {
    if (e.target.closest("#btnVerMaisSubarea")) {
        const card = e.target.closest("#btnVerMaisSubarea");
        const subareaId = card.getAttribute("data-id");
        // Redirect to the university details page with the codigo as query parameter
        if (subareaId) {
            window.location.href = `area.html?codigo=${encodeURIComponent(subareaId)}`;
        }
    }
    const btn = e.target.closest("#btnVerMaisSubarea");
    if (!btn) return;
    const subareaId = btn.getAttribute("data-id") || btn.dataset.id;
    if (subareaId) {
        window.location.href = `subarea.html?codigo=${encodeURIComponent(subareaId)}`;
    }
});
