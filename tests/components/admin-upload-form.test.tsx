import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminUploadForm from '@/components/AdminUploadForm';

/**
 * Vercel's serverless functions reject oversized request bodies with a
 * plain-text "Request Entity Too Large" response before the route handler
 * ever runs. response.json() on that throws a SyntaxError, and the old
 * code let that syntax error become the displayed message — a confusing
 * "Unexpected token 'R'..." instead of something a person can act on.
 */
function makeFile(name: string, sizeBytes: number, type = 'application/pdf'): File {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
}

describe('AdminUploadForm', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    delete (global as { fetch?: typeof fetch }).fetch;
  });

  it('rejects an oversized file locally, without calling fetch', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    const { container } = render(<AdminUploadForm />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const bigFile = makeFile('ctb.pdf', 10 * 1024 * 1024); // 10MB

    await userEvent.upload(input, bigFile);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(await screen.findByText(/muito grande/i)).toBeInTheDocument();
  });

  it('shows a readable message when the server rejects with a non-JSON body', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 413,
      json: () => Promise.reject(new SyntaxError("Unexpected token 'R', \"Request En\"... is not valid JSON")),
      text: () => Promise.resolve('Request Entity Too Large'),
    }) as unknown as typeof fetch;

    const { container } = render(<AdminUploadForm />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeFile('ctb.pdf', 1024);

    await userEvent.upload(input, file);

    const message = await screen.findByText(/ctb\.pdf/);
    expect(message.textContent).not.toMatch(/Unexpected token/);
    expect(message.textContent).toMatch(/muito grande|arquivo muito grande|não foi possível/i);
  });
});
