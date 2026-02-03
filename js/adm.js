import { SupabaseService } from './supabase.js';
const supabaseService = new SupabaseService();

// Mapear as colunas das tabelas (com base no teu diagrama)
const schema = {
    universidade: ["codigo", "nome", "sigla", "categoria_administrativa", "municipio_codigo", "organizacao_academica_codigo", "igc_continuo", "logo", "igc"],
    campus: ["codigo", "nome", "municipio_codigo", "universidade_codigo"],
    curso: ["codigo", "nome", "nome_completo", "subarea_codigo", "grau_codigo"],
    usuario: ["codigo", "nome", "email", "senha"],
    comentario: ["codigo", "universidade_codigo", "usuario_codigo", "categoria", "data", "texto"],
    historico_consulta: ["codigo", "usuario_codigo", "categoria"],
    categoria: ["id", "nome"],
    subarea: ["codigo", "nome", "area_codigo"],
    area: ["codigo", "nome"],
    grau: ["codigo", "nome"],
    municipio: ["codigo", "nome", "uf_codigo"],
    uf: ["codigo", "nome", "sigla", "regiao_codigo"],
    regiao: ["codigo", "nome"]
};

// Escuta mudança no select
document.getElementById("tabelaSelect").addEventListener("change", async function () {
    const tabela = this.value;
    if (!tabela) return;

    renderTabela(tabela);
});

// Renderizar tabela + dados
async function renderTabela(tabela) {
    const pk = tabela === "categoria" ? "id" : "codigo";

    const { data, error } = await supabaseService.supabase
        .from(tabela)
        .select("*")
        .order(pk, { ascending: true });
    const container = document.getElementById("tabelaContainer");
    const formContainer = document.getElementById("formContainer");

    if (error) {
        container.innerHTML = `<p style="color:red">Erro: ${error.message}</p>`;
        return;
    }

    // Renderizar tabela HTML
    if (!data || data.length === 0) {
        container.innerHTML = `<p>Nenhum registro encontrado em <b>${tabela}</b>.</p>`;
    } else {
        let html = `<table><thead><tr>`;
        schema[tabela].forEach(col => {
            html += `<th>${col}</th>`;
        });
        html += `<th id="excluir">EXCLUIR</th></tr></thead><tbody>`;

        data.forEach(row => {
            html += `<tr>`;
            schema[tabela].forEach(col => {
                html += `<td>${row[col] ?? ""}</td>`;
            });
            html += `<td><button onclick="deletar('${tabela}', ${row.codigo || row.id})">Excluir</button></td>`;
            html += `</tr>`;
        });
        html += "</tbody></table>";
        container.innerHTML = html;
    }

    let formHtml = `<h2>Adicionar em ${tabela}</h2><form id="formAdd">`;
    schema[tabela].forEach(col => {
        if (col === "codigo" || col === "id") return;
        formHtml += `
            <div>
                <label class="form-label">${col}</label>
                <input class="form-control" name="${col}">
            </div>`;
    });
    formHtml += `<button type="submit">Adicionar</button></form>`;
    formContainer.innerHTML = formHtml;

    // Submeter formulário
    document.getElementById("formAdd").addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const obj = {};
        formData.forEach((value, key) => { obj[key] = value; });

        const { error } = await supabaseService.supabase.from(tabela).insert([obj]);
        if (error) {
            alert("Erro ao adicionar: " + error.message);
        } else {
            alert("Registro adicionado!");
            renderTabela(tabela);
        }
    });
}

// Função global para deletar
window.deletar = async function (tabela, codigo) {
    if (!confirm("Deseja realmente excluir?")) return;
    const pk = tabela === "categoria" ? "id" : "codigo";
    const { error } = await supabaseService.supabase.from(tabela).delete().eq(pk, codigo);
    if (error) {
        alert("Erro ao excluir: " + error.message);
    } else {
        alert("Registro excluído!");
        renderTabela(tabela);
    }
};
