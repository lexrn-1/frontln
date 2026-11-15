import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';

import { AvatarComponent } from '../../shared/ui/atoms/avatar/avatar.component';
import { IconComponent } from '../../shared/ui/atoms/icon/icon.component';
import { ConfirmDialogComponent } from '../../shared/ui/molecules/confirm-dialog/confirm-dialog.component';
import { ProfileFormComponent } from './components/profile-form.component';
import { UpdateProfileRequest } from './models/profile.models';
import { ProfileStore } from './store/profile.store';

/** "Mi perfil" (ruta `/perfil`, dentro del shell): datos personales, progreso, edición y borrado de cuenta. */
@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [AvatarComponent, ConfirmDialogComponent, IconComponent, ProfileFormComponent],
  providers: [ProfileStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile-page.component.html'
})
export class ProfilePageComponent implements OnInit {
  protected readonly store = inject(ProfileStore);

  ngOnInit(): void {
    void this.store.load();
  }

  protected save(request: UpdateProfileRequest): void {
    void this.store.save(request);
  }
}
