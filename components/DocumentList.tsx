'use client';

import { useEffect, useState } from 'react';
import { Dispositivo } from '@/lib/db/schema';

/**
 * Document list component with search, filter, and pagination
 * Displays documents from the dispositivos table
 */

interface DocumentListProps {
  refreshTrigger?: number;
}

type SortField = 'numero_dispositivo' | 'data_publicacao' | 'tipo';
type FilterType = '' | 'lei' | 'resolucao' | 'portaria' | 'jurisprudencia' | 'manual';

export default function DocumentList({ refreshTrigger }: DocumentListProps) {
  const [documents, setDocuments] = useState<Dispositivo[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Dispositivo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('');
  const [sortField, setSortField] = useState<SortField>('data_publicacao');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [bancoConfigurado, setBancoConfigurado] = useState(true);

  const itemsPerPage = 20;

  // Fetch documents
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/admin/documents');
        if (!response.ok) {
          throw new Error('Failed to fetch documents');
        }

        const data = await response.json();
        setDocuments(data.documents || []);
        setBancoConfigurado(data.bancoConfigurado !== false);
      } catch (err) {
        console.error('Error fetching documents:', err);
        setError('Não foi possível carregar os documentos.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocuments();
  }, [refreshTrigger]);

  // Filter and sort documents
  useEffect(() => {
    let filtered = [...documents];

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (doc) =>
          doc.numero_dispositivo.toLowerCase().includes(search) ||
          doc.texto.toLowerCase().includes(search)
      );
    }

    // Apply type filter
    if (filterType) {
      filtered = filtered.filter((doc) => doc.tipo === filterType);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';

      if (sortField === 'numero_dispositivo') {
        aValue = a.numero_dispositivo;
        bValue = b.numero_dispositivo;
      } else if (sortField === 'data_publicacao') {
        aValue = a.data_publicacao;
        bValue = b.data_publicacao;
      } else if (sortField === 'tipo') {
        aValue = a.tipo;
        bValue = b.tipo;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredDocuments(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  }, [documents, searchTerm, filterType, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDocuments = filteredDocuments.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-600">Carregando documentos…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="w-full">
      {!bancoConfigurado && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Banco de dados não configurado.</strong> Defina{' '}
          <code>NEXT_PUBLIC_SUPABASE_URL</code>, <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> e{' '}
          <code>SUPABASE_SERVICE_ROLE_KEY</code> e aplique as migrations em{' '}
          <code>scripts/migrations.sql</code> e <code>scripts/migrations-002-config.sql</code>.
        </div>
      )}

      <div className="mb-6 space-y-4">
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
            Buscar
          </label>
          <input
            id="search"
            type="text"
            placeholder="Buscar por número do dispositivo ou conteúdo…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="filter" className="block text-sm font-medium text-gray-700 mb-2">
              Filtrar por tipo
            </label>
            <select
              id="filter"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
            >
              <option value="">Todos os tipos</option>
              <option value="lei">Lei</option>
              <option value="resolucao">Resolução</option>
              <option value="portaria">Portaria</option>
              <option value="jurisprudencia">Jurisprudência</option>
              <option value="manual">Manual</option>
            </select>
          </div>

          <div>
            <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-2">
              Ordenar por
            </label>
            <select
              id="sort"
              value={sortField}
              onChange={(e) => handleSort(e.target.value as SortField)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
            >
              <option value="numero_dispositivo">Número do dispositivo</option>
              <option value="data_publicacao">Data de publicação</option>
              <option value="tipo">Tipo</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th
                  className="px-6 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('numero_dispositivo')}
                >
                  <div className="flex items-center gap-2">
                    Dispositivo
                    {sortField === 'numero_dispositivo' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Tipo
                </th>
                <th
                  className="px-6 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('data_publicacao')}
                >
                  <div className="flex items-center gap-2">
                    Publicação
                    {sortField === 'data_publicacao' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Vigência
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedDocuments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    Nenhum documento encontrado
                  </td>
                </tr>
              ) : (
                paginatedDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      {doc.numero_dispositivo}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                        {doc.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(doc.data_publicacao)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(doc.data_vigencia_inicio)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {filteredDocuments.length > 0 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Mostrando {startIndex + 1} a{' '}
            {Math.min(startIndex + itemsPerPage, filteredDocuments.length)} de{' '}
            {filteredDocuments.length} documentos
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>

            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    currentPage === page
                      ? 'bg-green-600 text-white'
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
