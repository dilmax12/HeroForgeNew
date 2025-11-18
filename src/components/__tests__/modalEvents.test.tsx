import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// PartyInviteModal dependencies
vi.mock('../../store/heroStore', () => ({
  useHeroStore: () => ({
    getSelectedHero: () => ({ id: 'h1', name: 'Herói' }),
    parties: [{ id: 'p1', name: 'Party 1', invites: ['h1'] }],
    acceptPartyInvite: vi.fn(),
    declinePartyInvite: vi.fn(),
  }),
}));

// BattleModal dependencies
vi.mock('../../utils/combat', () => ({
  resolveCombat: () => ({
    log: ['Herói ataca'],
    victory: true,
    damage: 1,
    xpGained: 5,
    petElementHighlights: [],
  }),
}));
vi.mock('../../components/NotificationSystem', () => ({
  notificationBus: { emit: vi.fn() },
}));

// ThemePreviewModal dependencies
vi.mock('../../store/monetizationStore', () => ({
  useMonetizationStore: () => ({ setActiveFrame: vi.fn(), activeSeasonalTheme: undefined }),
}));

import PartyInviteModal from '../PartyInviteModal';
import BattleModal from '../BattleModal';
import GalleryLightbox from '../GalleryLightbox';
import ThemePreviewModal from '../ThemePreviewModal';

describe('Eventos de Modal', () => {
  it('PartyInviteModal chama onClose ao clicar overlay e botão fechar', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container, getByText } = render(<PartyInviteModal open onClose={onClose} />);

    const fecharBtn = getByText('✖');
    await user.click(fecharBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    const overlay = container.querySelector('.absolute.inset-0');
    expect(overlay).toBeTruthy();
    if (overlay) {
      await user.click(overlay as HTMLElement);
    }
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('BattleModal chama onClose no overlay e envia onResult ao concluir', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onResult = vi.fn();
    const hero: any = { id: 'h1', name: 'Herói', pets: [], derivedAttributes: { hp: 10 } };
    const enemies: any = [{ type: 'Goblin', count: 1 }];
    const { container, getByText } = render(
      <BattleModal hero={hero} enemies={enemies} onClose={onClose} onResult={onResult} />
    );

    const overlay = container.querySelector('.absolute.inset-0');
    expect(overlay).toBeTruthy();
    if (overlay) {
      await user.click(overlay as HTMLElement);
    }
    expect(onClose).toHaveBeenCalledTimes(1);

    const concluir = getByText('Concluir');
    await user.click(concluir);
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('GalleryLightbox fecha com tecla Escape e botão fechar', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const items: any[] = [{ id: '1', name: 'A', image: '' }, { id: '2', name: 'B', image: '' }];
    const { getByLabelText } = render(
      <GalleryLightbox items={items} index={0} onClose={onClose} onNavigate={() => {}} />
    );

    const fecharBtn = getByLabelText('Fechar');
    await user.click(fecharBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('ThemePreviewModal fecha ao clicar overlay e botão', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container, getByText } = render(
      <ThemePreviewModal open onClose={onClose} previewFrameId="medieval" />
    );

    const fecharBtn = getByText('Fechar');
    await user.click(fecharBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    const overlay = container.querySelector('.absolute.inset-0');
    expect(overlay).toBeTruthy();
    if (overlay) {
      await user.click(overlay as HTMLElement);
    }
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});