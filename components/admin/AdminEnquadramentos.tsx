'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Enquadramento } from '@/lib/db/schema';
import { formatarMulta, labelDocumento, labelResponsavel } from '@/lib/response/format';

const VAZIO: Partial<Enquadramento> = {
  codigo_mbft: '',
  desdobramento: 0,
  descricao: '',
  gravidade: 'média',
  pontos: 0,
  valor_multa: 0,
  unidade: 'UIRF',
  retem_veiculo: false,
  remove_veiculo: false,
  recolhe_documento: null,
  amparo_legal: '',
  medida_administrativa: '',
  responsavel: 'condutor',
};

/**
 * CRUD for MBFT enforcement codes: the values that feed the response cards and the dossiês
 */
export default function AdminEnquadramentos() {
  const [itens, setItens] = useState<Enquadramento[]>([]);
  const [form, setForm] = useState<Partial<Enquadramento>>(VAZIO);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [busca, setBusca] = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const resposta = await fetch('/api/admin/enquadramentos');
      if (!resposta.ok) throw new Error('Falha ao carregar enquadramentos.');
      const data = await resposta.json();
      setItens(data.enquadramentos ?? []);
      setAviso(data.aviso ?? null);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const salvar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setSalvando(true);
    setErro(null);
    setMensagem(null);

    try {
      const resposta = await fetch('/api/admin/enquadramentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          desdobramento: Number(form.desdobramento ?? 0),
          pontos: Number(form.pontos ?? 0),
          valor_multa: Number(form.valor_multa ?? 0),
        }),
      });

      const data = await resposta.json();
      if (!resposta.ok) {
        // `error` is a machine code (upsert_failed): show the human sentence first.
        throw new Error(
          data.message || data.issues?.[0]?.mensagem || data.error || 'Falha ao salvar enquadramento.'
        );
      }

      setMensagem(`Enquadramento ${data.enquadramento.codigo_mbft} salvo.`);
      setForm(VAZIO);
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setSalvando(false);
    }
  };

  const remover = async (codigo: string) => {
    if (!confirm(`Remover o enquadramento ${codigo}?`)) return;
    try {
      const resposta = await fetch(
        `/api/admin/enquadramentos?codigo=${encodeURIComponent(codigo)}`,
        { method: 'DELETE' }
      );
      if (!resposta.ok) throw new Error('Falha ao remover.');
      setMensagem(`Enquadramento ${codigo} removido.`);
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro desconhecido');
    }
  };

  const editar = (item: Enquadramento) => {
    setForm(item);
    setMensagem(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filtrados = itens.filter((item) =>
    `${item.codigo_mbft} ${item.descricao}`.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <form onSubmit={salvar} className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {form.id ? `Editar ${form.codigo_mbft}` : 'Novo enquadramento'}
          </h2>
          {form.id && (
            <button
              type="button"
              onClick={() => setForm(VAZIO)}
              className="text-sm text-gray-600 underline"
            >
              Cancelar edição
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Campo label="Código MBFT">
            <input
              required
              value={form.codigo_mbft ?? ''}
              onChange={(e) => setForm({ ...form, codigo_mbft: e.target.value })}
              placeholder="516-91"
              className={inputClass}
            />
          </Campo>
          <Campo label="Desdobramento">
            <input
              type="number"
              min={0}
              value={form.desdobramento ?? 0}
              onChange={(e) => setForm({ ...form, desdobramento: Number(e.target.value) })}
              className={inputClass}
            />
          </Campo>
          <Campo label="Amparo legal">
            <input
              required
              value={form.amparo_legal ?? ''}
              onChange={(e) => setForm({ ...form, amparo_legal: e.target.value })}
              placeholder="art. 181 XVII do CTB"
              className={inputClass}
            />
          </Campo>
        </div>

        <Campo label="Descrição da infração">
          <input
            required
            value={form.descricao ?? ''}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            className={inputClass}
          />
        </Campo>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Campo label="Gravidade">
            <select
              value={form.gravidade ?? 'média'}
              onChange={(e) =>
                setForm({ ...form, gravidade: e.target.value as Enquadramento['gravidade'] })
              }
              className={inputClass}
            >
              <option value="leve">Leve</option>
              <option value="média">Média</option>
              <option value="grave">Grave</option>
              <option value="gravíssima">Gravíssima</option>
            </select>
          </Campo>
          <Campo label="Pontos">
            <input
              type="number"
              min={0}
              max={20}
              value={form.pontos ?? 0}
              onChange={(e) => setForm({ ...form, pontos: Number(e.target.value) })}
              className={inputClass}
            />
          </Campo>
          <Campo label="Multa (centavos)">
            <input
              type="number"
              min={0}
              value={form.valor_multa ?? 0}
              onChange={(e) => setForm({ ...form, valor_multa: Number(e.target.value) })}
              className={inputClass}
            />
          </Campo>
          <Campo label="Unidade">
            <input
              value={form.unidade ?? ''}
              onChange={(e) => setForm({ ...form, unidade: e.target.value })}
              className={inputClass}
            />
          </Campo>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Campo label="Responsável">
            <select
              value={form.responsavel ?? 'condutor'}
              onChange={(e) =>
                setForm({ ...form, responsavel: e.target.value as Enquadramento['responsavel'] })
              }
              className={inputClass}
            >
              <option value="condutor">Condutor</option>
              <option value="proprietario">Proprietário</option>
              <option value="ambos">Ambos</option>
            </select>
          </Campo>
          <Campo label="Recolhe documento">
            <select
              value={form.recolhe_documento ?? ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  recolhe_documento: (e.target.value || null) as Enquadramento['recolhe_documento'],
                })
              }
              className={inputClass}
            >
              <option value="">Nenhum</option>
              <option value="cnh">CNH</option>
              <option value="crlv">CRLV</option>
              <option value="ambos">Ambos</option>
            </select>
          </Campo>
          <Campo label="Medida administrativa">
            <input
              value={form.medida_administrativa ?? ''}
              onChange={(e) => setForm({ ...form, medida_administrativa: e.target.value })}
              className={inputClass}
            />
          </Campo>
        </div>

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={Boolean(form.retem_veiculo)}
              onChange={(e) => setForm({ ...form, retem_veiculo: e.target.checked })}
            />
            Retém veículo
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={Boolean(form.remove_veiculo)}
              onChange={(e) => setForm({ ...form, remove_veiculo: e.target.checked })}
            />
            Remove veículo
          </label>
        </div>

        {erro && (
          <p className="text-sm text-red-700" role="alert">
            {erro}
          </p>
        )}
        {aviso && !erro && (
          <p className="text-sm text-amber-700" role="status">
            {aviso}
          </p>
        )}
        {mensagem && <p className="text-sm text-green-700">{mensagem}</p>}

        <button
          type="submit"
          disabled={salvando}
          className="bg-ctb-green hover:bg-ctb-green/90 disabled:opacity-60 text-white font-semibold px-6 py-2 rounded-lg"
        >
          {salvando ? 'Salvando…' : 'Salvar enquadramento'}
        </button>
      </form>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Enquadramentos cadastrados ({itens.length})
          </h2>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por código ou descrição"
            className={`${inputClass} md:w-80`}
          />
        </div>

        {carregando ? (
          <p className="text-gray-600">Carregando…</p>
        ) : filtrados.length === 0 ? (
          <p className="text-gray-600">Nenhum enquadramento encontrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-3 py-2">Código</th>
                  <th className="px-3 py-2">Descrição</th>
                  <th className="px-3 py-2">Gravidade</th>
                  <th className="px-3 py-2">Pontos</th>
                  <th className="px-3 py-2">Multa</th>
                  <th className="px-3 py-2">Medidas</th>
                  <th className="px-3 py-2">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtrados.map((item) => (
                  <tr key={item.codigo_mbft}>
                    <td className="px-3 py-2 font-mono">{item.codigo_mbft}</td>
                    <td className="px-3 py-2">{item.descricao}</td>
                    <td className="px-3 py-2">{item.gravidade}</td>
                    <td className="px-3 py-2">{item.pontos}</td>
                    <td className="px-3 py-2">{formatarMulta(item.valor_multa)}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      {[
                        item.retem_veiculo ? 'retenção' : null,
                        item.remove_veiculo ? 'remoção' : null,
                        labelDocumento(item.recolhe_documento),
                        labelResponsavel(item.responsavel),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-3">
                        <button
                          onClick={() => editar(item)}
                          className="text-ctb-green underline"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => remover(item.codigo_mbft)}
                          className="text-red-600 underline"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ctb-green focus:border-transparent outline-none';

/**
 * Labelled form field
 * @param props - Label text and control
 */
function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      {children}
    </label>
  );
}
