import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import DesenhoVeiculo from '@/components/pesos-dimensoes/DesenhoVeiculo';
import SeletorConfiguracao from '@/components/pesos-dimensoes/SeletorConfiguracao';
import { listarConfiguracoes, obterConfiguracao } from '@/lib/pesos-dimensoes/catalogo';

describe('Seletor visual de configuração', () => {
  it('abre opções em linhas com nome, eixos e desenho', async () => {
    const onChange = jest.fn();
    render(<SeletorConfiguracao valor="truck-3-eixos" onChange={onChange} />);

    const gatilho = screen.getByRole('button', { name: /selecionar configuração/i });
    expect(gatilho).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(gatilho);

    expect(gatilho).toHaveAttribute('aria-expanded', 'true');
    const lista = screen.getByRole('listbox', { name: /configurações de veículo/i });
    expect(within(lista).getAllByRole('option')).toHaveLength(listarConfiguracoes().length);
    expect(within(lista).getAllByText(/9 eixos/i).length).toBeGreaterThan(0);
    expect(within(lista).getByText('3S3D3')).toBeInTheDocument();
    expect(within(lista).getByText(/rodotrem, nove eixos/i)).toBeInTheDocument();
    expect(within(lista).getByText(/PBT\/PBTC máximo: 74\.000 kg/i)).toBeInTheDocument();

    await userEvent.click(within(lista).getByRole('option', { name: /rodotrem/i }));
    expect(onChange).toHaveBeenCalledWith('rodotrem-9-eixos-aet');
    expect(gatilho).toHaveAttribute('aria-expanded', 'false');
  });

  it('mostra o código, os apelidos e o nome de todos os grupos de eixos selecionados', () => {
    render(<SeletorConfiguracao valor="truck-3-eixos" onChange={jest.fn()} />);

    expect(screen.getByText('3C')).toBeInTheDocument();
    expect(screen.getByText(/truck, trucado/i)).toBeInTheDocument();
    expect(screen.getByText(/PBT\/PBTC máximo: 23\.000 kg/i)).toBeInTheDocument();
    expect(screen.getByText(/E1.*Eixo dianteiro.*6\.000 kg/i)).toBeInTheDocument();
    expect(screen.getByText(/E2–E3.*Tandem traseiro.*17\.000 kg/i)).toBeInTheDocument();
  });

  it('fecha pelo teclado e identifica a opção selecionada', async () => {
    render(<SeletorConfiguracao valor="truck-3-eixos" onChange={jest.fn()} />);
    const gatilho = screen.getByRole('button', { name: /selecionar configuração/i });
    gatilho.focus();
    await userEvent.keyboard('{ArrowDown}');
    const selecionada = screen.getAllByRole('option').find((opcao) => opcao.getAttribute('aria-selected') === 'true');
    expect(selecionada).toHaveTextContent('Caminhão truck — 3 eixos');
    await userEvent.keyboard('{Escape}');
    expect(gatilho).toHaveAttribute('aria-expanded', 'false');
    expect(gatilho).toHaveFocus();
  });

  it('desenha a quantidade de eixos e unidades da configuração', () => {
    const configuracao = obterConfiguracao('rodotrem-9-eixos-aet');
    expect(configuracao).not.toBeNull();
    const { container } = render(<DesenhoVeiculo configuracao={configuracao!} />);
    expect(screen.getByRole('img', { name: /rodotrem.*9 eixos.*3 unidades/i })).toBeInTheDocument();
    expect(container.querySelectorAll('[data-eixo="true"]')).toHaveLength(9);
    expect(container.querySelectorAll('[data-unidade="true"]')).toHaveLength(3);
  });
});
