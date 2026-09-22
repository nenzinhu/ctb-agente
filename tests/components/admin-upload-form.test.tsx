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
}

describe('AdminUploadForm', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    delete (global as { fetch?: typeof fetch }).fetch;
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
    expect(ingestBody).toMatchObject({ storagePath: '123-ctb.pdf', normaId: 'ctb' });
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
