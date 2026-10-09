import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminUploadForm from '@/components/AdminUploadForm';

/**
 * Uploads now go browser → Supabase Storage directly (a signed URL minted
 * by /api/admin/documents/upload-url), then a tiny JSON call to
 * /api/ingestion/upload tells the server which storage path to process.
 * Vercel's serverless functions reject request bodies over 4.5MB before the
 * route handler ever runs — routing the file through Storage instead is
 * what lets this restore the original 50MB limit.
 */
const uploadToSignedUrl = jest.fn(async (_path: string, _token: string, _file: File) => ({
  data: { path: 'x' },
  error: null as { message: string } | null,
}));

jest.mock('../../lib/db/browser-client', () => ({
  supabaseBrowser: {
    storage: {
      from: () => ({
        uploadToSignedUrl: (path: string, token: string, file: File) => uploadToSignedUrl(path, token, file),
      }),
    },
  },
}));

function makeFile(name: string, sizeBytes: number, type = 'application/pdf'): File {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
}

async function fillMetadata() {
  const normaInput = screen.getByLabelText(/norma/i);
  await userEvent.type(normaInput, 'ctb');
  await userEvent.type(screen.getByLabelText('Fonte oficial'), 'https://www.planalto.gov.br/');
  await userEvent.type(screen.getByLabelText('Versão'), 'CTB compilado 2026');
  await userEvent.type(screen.getByLabelText('Vigente desde'), '2024-01-01');
  await userEvent.type(screen.getByLabelText('Conferido em'), '2026-09-01');
}

describe('AdminUploadForm', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    delete (global as { fetch?: typeof fetch }).fetch;
  });

  it('mostra os quatro metadados oficiais obrigatórios', () => {
    render(<AdminUploadForm />);
    expect(screen.getByLabelText('Fonte oficial')).toBeRequired();
    expect(screen.getByLabelText('Versão')).toBeRequired();
    expect(screen.getByLabelText('Vigente desde')).toBeRequired();
    expect(screen.getByLabelText('Conferido em')).toBeRequired();
  });

  it('rejects an oversized file locally, without calling fetch', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    const { container } = render(<AdminUploadForm />);
    await fillMetadata();

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const bigFile = makeFile('ctb.pdf', 60 * 1024 * 1024); // 60MB, over the bucket's 50MB limit

    await userEvent.upload(input, bigFile);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(await screen.findByText(/muito grande/i)).toBeInTheDocument();
  });

  it('blocks the upload when no norma was entered, without calling fetch', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    const { container } = render(<AdminUploadForm />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, makeFile('ctb.pdf', 1024));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(await screen.findByText(/informe a norma/i)).toBeInTheDocument();
  });

  it('bloqueia o envio quando um metadado oficial está vazio', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    const { container } = render(<AdminUploadForm />);
    await userEvent.type(screen.getByLabelText(/norma/i), 'ctb');

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, makeFile('ctb.pdf', 1024));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(await screen.findByText(/fonte, versão, vigência e conferência/i)).toBeInTheDocument();
  });

  it('uploads straight to Storage, then tells the server to process it', async () => {
    const fetchMock = jest.fn(async (url: string, _init?: RequestInit) => {
      if (url === '/api/admin/documents/upload-url') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ bucket: 'documentos-pendentes', path: '123-ctb.pdf', token: 'tok' }),
        };
      }
      if (url === '/api/ingestion/upload') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: { insertedCount: 3 } }),
        };
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { container } = render(<AdminUploadForm />);
    await fillMetadata();

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, makeFile('ctb.pdf', 1024));

    expect(await screen.findByText(/enviado/i)).toBeInTheDocument();
    expect(uploadToSignedUrl).toHaveBeenCalledWith('123-ctb.pdf', 'tok', expect.any(File));

    const ingestCall = fetchMock.mock.calls.find(([url]) => url === '/api/ingestion/upload');
    const ingestBody = JSON.parse((ingestCall?.[1] as RequestInit).body as string);
    expect(ingestBody).toMatchObject({
      storagePath: '123-ctb.pdf',
      normaId: 'ctb',
      fonteOficial: 'https://www.planalto.gov.br/',
      versao: 'CTB compilado 2026',
      vigenteDesde: '2024-01-01',
      conferidoEm: '2026-09-01',
    });
  });

  it('infers the content type from the extension when the browser reports none', async () => {
    const fetchMock = jest.fn(async (url: string, _init?: RequestInit) => {
      if (url === '/api/admin/documents/upload-url') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ bucket: 'documentos-pendentes', path: '123-lei.docx', token: 'tok' }),
        };
      }
      return { ok: true, status: 200, json: async () => ({ success: true, data: { insertedCount: 1 } }) };
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { container } = render(<AdminUploadForm />);
    await fillMetadata();

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, makeFile('lei.docx', 1024, ''));

    expect(await screen.findByText(/com sucesso/i)).toBeInTheDocument();
    const urlCall = fetchMock.mock.calls.find(([url]) => url === '/api/admin/documents/upload-url');
    expect(JSON.parse((urlCall?.[1] as RequestInit).body as string).contentType).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
  });

  it('shows a readable message when the signed-url step returns a non-JSON body', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: false,
      status: 413,
      json: () => Promise.reject(new SyntaxError("Unexpected token 'R'")),
      text: () => Promise.resolve('Request Entity Too Large'),
    }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { container } = render(<AdminUploadForm />);
    await fillMetadata();

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, makeFile('ctb.pdf', 1024));

    const message = await screen.findByText(/ctb\.pdf/);
    expect(message.textContent).not.toMatch(/Unexpected token/);
    expect(uploadToSignedUrl).not.toHaveBeenCalled();
  });
});
