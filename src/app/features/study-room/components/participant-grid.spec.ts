import { TestBed } from '@angular/core/testing';

import { Participant } from '../models/study-room.models';
import { ParticipantGridComponent } from './participant-grid.component';

const people = (n: number): Participant[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i}`, label: `P${i}`, fullName: `Persona ${i}`, initials: `P${i}`, tone: 'peach', isSelf: i === 0, micOn: true, camOn: true }));

describe('ParticipantGridComponent', () => {
  const render = (n: number, compact: boolean, max = 4) => {
    const f = TestBed.createComponent(ParticipantGridComponent);
    f.componentRef.setInput('participants', people(n));
    f.componentRef.setInput('compact', compact);
    f.componentRef.setInput('maxVisible', max);
    f.detectChanges();
    return f.nativeElement as HTMLElement;
  };

  it('shows everyone when they fit', () => {
    const el = render(4, true);
    expect(el.querySelectorAll('li').length).toBe(4);
    expect(el.textContent).not.toContain('+');
  });

  it('with more than 4 shows 3 people plus a "+N" tile (like Meet)', () => {
    const el = render(18, true);
    expect(el.querySelectorAll('li').length).toBe(4);
    const last = el.querySelectorAll('li')[3];
    expect(last.textContent).toContain('+15');
    expect(last.getAttribute('aria-label')).toBe('15 participantes más');
  });
});
