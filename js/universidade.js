import { SupabaseService } from './supabase.js';

const supabaseService = new SupabaseService();

import { adicionarComentario, carregarComentarios, inicializarComentarios } from './comentarios.js';


// Runtime helper to get universidade by codigo (keeps js/supabase.js untouched)
supabaseService.getUniversidadeByCodigo = async function (codigo) {
	return this.supabase
		.from('universidade')
		.select(`
			*,
			municipio:municipio_codigo (nome),
			organizacao:organizacao_academica_codigo (descricao)
		`)
		.eq('codigo', codigo)
		.single();
};

// Runtime helper to get campi for a universidade
supabaseService.getCampiByUniversidade = async function (universidadeCodigo) {
	return this.supabase
		.from('campus')
		.select(`*, municipio:municipio_codigo (nome)`)
		.eq('universidade_codigo', universidadeCodigo);
};



// Runtime helper to get cursos for a universidade via campus_has_curso (N:N)
supabaseService.getCursoByUniversidade = async function (universidadeCodigo) {
	// 1) pega campi
	const { data: campi, error: campiError } = await this.getCampiByUniversidade(universidadeCodigo);
	if (campiError) return { data: null, error: campiError };
	if (!campi || campi.length === 0) return { data: [], error: null };

	const campusIds = campi.map(c => c.codigo);

	// 2) pega links em campus_has_curso
	const { data: links, error: linksError } = await this.supabase
		.from('campus_has_curso')
		.select('curso_codigo')
		.in('campus_codigo', campusIds);

	if (linksError) return { data: null, error: linksError };
	if (!links || links.length === 0) return { data: [], error: null };

	const cursoIds = Array.from(new Set(links.map(l => l.curso_codigo)));

	// 3) buscar cursos por ids com subarea/grau/area
	return this.supabase
		.from('curso')
		.select('*, subarea:subarea_codigo (nome, area:area_codigo (nome)), grau:grau_codigo (nome)')
		.in('codigo', cursoIds);
};

// Utility to read query params
function getQueryParam(name) {
	const params = new URLSearchParams(window.location.search);
	return params.get(name);
}

function criarCardCampus(campus) {
	return `
		<div class="cardcampus" data-id="${campus?.codigo}">
			<div id="topoCardCampus">
				<div id="iconeCardCampus"><i class="fa-solid fa-building"></i></div>
				<div id="nomeCampus">
					<div>${campus?.nome || 'Nome do campus'}</div>
					
				</div>
			</div>

			<div id="detalhesCardCampus">
				<div > <i class="fa-solid fa-location-dot"></i>${campus?.municipio?.nome || '-'}</div>
			

				<div id=botaoCardCampus>
				<button class="learn-more">
  					<span class="circle" aria-hidden="true">
  					<span class="icon arrow"></span>
  					</span>
  					<span class="button-text">Ver mais</span>
				</button>
				</div>
			</div>
		</div>
	`;
}

function criarCardCurso(curso) {
	const areaNome = curso?.subarea?.area?.nome || '';
	const subareaNome = curso?.subarea?.nome || '';
	const grauNome = curso?.grau?.nome || '';

	// id for the 'Área:' label only (keep unique when curso.codigo exists)
	const areaLabelId = curso?.codigo ? `area-label-${curso.codigo}` : 'area-label-example';

	return `
		<div class="cardcurso">
			<div class="cardcurso-header">
				<div class="cardcurso-title">${curso?.nome || curso?.nome_completo || 'Nome do curso'}</div>
				<div class="cardcurso-bookmark"> <i class="fa-solid fa-graduation-cap"></i></div>
			</div>

			<div class="cardcurso-body">
				${areaNome ? `<div class="cardcurso-row"><span class="cardcurso-label" id="${areaLabelId}">Área:</span> <span class="cardcurso-value area-value">${areaNome}</span></div>` : ''}
				${subareaNome ? `<div class="cardcurso-row"><span class="cardcurso-label">Subárea:</span> <span class="cardcurso-value subarea-value">${subareaNome}</span></div>` : ''}

				<div class="cardcurso-tags">
					${grauNome ? `<span class="tag tag-grau">${grauNome}</span>` : ''}
				</div>
			</div>
		</div>
	`;
}


async function renderUniversidade(codigo) {
	const container = document.getElementById('card-detalhe');
	if (!container) return;

	container.innerHTML = '<p style="color:#092e5e;font-size:1.2em;">Carregando...</p>';

	try {
		const { data: universidade, error: uniError } = await supabaseService.getUniversidadeByCodigo(codigo);

		if (uniError) {
			console.error('Erro ao buscar universidade:', uniError);
			container.innerHTML = `<p style="color:#c0392b;">Erro ao carregar universidade.</p>`;
			return;
		}

		if (!universidade) {
			container.innerHTML = `<p style="color:#092e5e;">Universidade não encontrada.</p>`;
			return;
		}

		let orgAcademica = universidade.organizacao?.descricao || '';
        let catAdm = universidade.categoria_administrativa || '-';

        if (
            orgAcademica === 'INSTITUTO FEDERAL DE EDUCAÇÃO CIÊNCIA E TECNOLOGIA DE SANTA CATARINA' ||
            orgAcademica === 'INSTITUTO FEDERAL DE EDUCAÇÃO CIÊNCIA E TECNOLOGIA DO RIO GRANDE DO SUL' ||
            orgAcademica === 'INSTITUTO FEDERAL DE EDUCAÇÃO CIÊNCIA E TECNOLOGIA SUL-RIO-GRANDENSE' ||
            orgAcademica === 'INSTITUTO FEDERAL DE EDUCAÇÃO CIÊNCIA E TECNOLOGIA DO PARANÁ' ||
            orgAcademica === 'INSTITUTO FEDERAL DE EDUCAÇÃO CIÊNCIA E TECNOLOGIA CATARINENSE' ||
            orgAcademica === 'INSTITUTO FEDERAL DE EDUCAÇÃO CIÊNCIA E TECNOLOGIA FARROUPILHA'
        ) {
            catAdm = '';
        }



		// University details HTML
		let html = `
			<div class="carduni ">
				<div class="d-flex align-items-center">
					<img id="logo" src="${universidade.logo || 'imagens/IFRS.jpg'}" alt="logo" style="width:370px;height:200px;object-fit:cover;margin-right:16px;"/>
					
				</div>

				<div id="infoUni">

					<div>
						
						<h1 id="tituloUni" >${universidade.sigla || ''}</h1>
						<p id="nomeUni" >${universidade.nome || ''}</p>
						
						
					</div>
				
					<div id="detalhesUni">
					<p><i class="fa-solid fa-location-dot"></i> ${universidade.municipio?.nome || '-'}</p>
					<p><i class="fa-solid fa-school"></i> ${orgAcademica} ${catAdm}</p>
					
					
					
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

						<a href="#avaliacoes"><button class="button">
  							<span class="button-content">Avaliar </span>
						</button>
						</a>
					</div>

				


				</div>
			</div>
		`;



		// Fetch campi for this university
		const { data: campi, error: campusError } = await supabaseService.getCampiByUniversidade(codigo);

		html += `<div id="divcampusTitulo"><h4 id="campustitulo">Campus da Universidade</h4>
				<p id="campusSubtitulo">Conheça as diferentes unidades:</p>
				</div>`;

		if (campusError) {
			console.error('Erro ao buscar campi:', campusError);
			html += `<p style="color:#c0392b;">Erro ao carregar campi.</p>`;
		} else if (!campi || campi.length === 0) {
			html += `<p style="color:#092e5e;">Nenhum campus encontrado para esta universidade.</p>`;
		} else {
			html += '<div id="campi-list">';
			campi.forEach(c => {
				html += criarCardCampus(c);
			});
			html += '</div>';
		}

		container.innerHTML = html;

		// Fetch cursos (via N:N) and render
		try {
			const { data: cursos, error: cursosError } = await supabaseService.getCursoByUniversidade(codigo);
			
			html = '';

			if (cursosError) {
				console.error('Erro ao buscar cursos:', cursosError);
				html += `<p style="color:#c0392b;">Erro ao carregar cursos.</p>`;
			} else if (!cursos || cursos.length === 0) {
				html += `<p style="color:#092e5e;">Nenhum curso encontrado para esta universidade.</p>`;
			} else {
				html += `<div id="divcursosTitulo"><h4 id="cursostitulo">Cursos oferecidos</h4>
					<p id="cursosSubtitulo">Veja alguns cursos ofertados pela universidade:</p>
					</div>`;

				if (cursos.length <= 6) {
					// render simple grid (no carousel)
					html += '<div id="cursos-list" class="lista-cursos">';
					cursos.forEach(curso => {
						html += criarCardCurso(curso);
					});
					html += '</div>';
				} else {
					// build carousel with pages of 6 cards (3 cols x 2 rows)
					const perPage = 6;
					const pages = [];
					for (let i = 0; i < cursos.length; i += perPage) {
                        const slice = cursos.slice(i, i + perPage);
                        let pageHtml = '<div class="carousel-page">';
                        slice.forEach(curso => { pageHtml += criarCardCurso(curso); });
                        pageHtml += '</div>';
                        pages.push(pageHtml);
                    }

                    // monta o HTML do carrossel corretamente (track contendo as pages)
                    html += `<div id="cursos-container-carousel">
                        <div class="carousel">
                            <button class="carousel-prev" aria-label="Anterior">‹</button>
                            <div class="carousel-track-wrapper">
                                <div class="carousel-track">
                                    ${pages.join('')}
                                </div>
                            </div>
                            <button class="carousel-next" aria-label="Próximo">›</button>
                        </div>
                    </div>`;
				}
			}

			const cursosContainer = document.createElement('div');
			cursosContainer.id = 'cursos-container';
			cursosContainer.innerHTML = html;
			container.appendChild(cursosContainer);

			try {
				initCursosCarousel();
			} catch (err) {
				console.error('Erro iniciando carrossel de cursos:', err);
			}

			// Load and initialize comments after everything else
			await carregarComentarios('universidade', codigo);
			inicializarComentarios(codigo);

		} catch (err) {
			console.error('Erro inesperado ao buscar cursos:', err);
		}

	} catch (err) {
		console.error(err);
		container.innerHTML = `<p style="color:#c0392b;">Erro inesperado.</p>`;
	}
}

// On load, read codigo param and render
document.addEventListener('DOMContentLoaded', function () {
    const codigo = getQueryParam('codigo');
    if (!codigo) {
        const container = document.getElementById('card-detalhe');
        if (container) container.innerHTML = `<p style="color:#092e5e;">Nenhuma universidade selecionada.</p>`;
        return;
    }

    renderUniversidade(codigo);
});

// Carousel initializer for cursos
function initCursosCarousel() {
	const carousel = document.querySelector('.carousel');
	if (!carousel) return;

	const track = carousel.querySelector('.carousel-track');
	const pages = Array.from(track.querySelectorAll('.carousel-page'));
	const prevBtn = carousel.querySelector('.carousel-prev');
	const nextBtn = carousel.querySelector('.carousel-next');

	let currentIndex = 0;

	function update() {
		if (!pages.length) return;
		const wrapper = carousel.querySelector('.carousel-track-wrapper');
		const pageWidth = wrapper ? wrapper.clientWidth : carousel.clientWidth;
		// animate track using pixel translation so sliding looks smooth
		track.style.transition = 'transform 420ms cubic-bezier(0.22,0.84,0.36,1)';
		track.style.transform = `translateX(-${currentIndex * pageWidth}px)`;

		if (prevBtn) prevBtn.disabled = currentIndex === 0;
		if (nextBtn) nextBtn.disabled = currentIndex === pages.length - 1;
	}

	if (prevBtn) prevBtn.addEventListener('click', () => { currentIndex = Math.max(0, currentIndex - 1); update(); });
	if (nextBtn) nextBtn.addEventListener('click', () => { currentIndex = Math.min(pages.length - 1, currentIndex + 1); update(); });

	// keyboard support
	document.addEventListener('keydown', (e) => {
		if (e.key === 'ArrowLeft') { currentIndex = Math.max(0, currentIndex - 1); update(); }
		if (e.key === 'ArrowRight') { currentIndex = Math.min(pages.length - 1, currentIndex + 1); update(); }
	});

	// make all pages visible and set grid layout, then update track transform
	pages.forEach(p => {
		p.style.display = 'grid';
		p.style.gridTemplateColumns = 'repeat(3, 1fr)';
		p.style.gap = '16px';
	});

	// initial state
	update();
}

document.addEventListener("click", function (e) {
    if (e.target.closest(".cardcampus")) {
        const card = e.target.closest(".cardcampus");
        const campusId = card.getAttribute("data-id");
        // Redirect to the university details page with the codigo as query parameter
        if (campusId) {
            window.location.href = `campus.html?codigo=${encodeURIComponent(campusId)}`;
        }
    }
});

const avaliar = document.getElementById("btnAvaliar");
const fechar = document.getElementById("fechar");
const box = document.getElementById("box");

avaliar.addEventListener("click", function()  {
  box.style.display = "flex"; // mostra a box
});

fechar.addEventListener("click", function() {
  box.style.display = "none"; // esconde a box
});

// Fechar clicando fora da caixa
box.addEventListener("click", function(e) {
  if (e.target === box) {
    box.style.display = "none";
  }
});


