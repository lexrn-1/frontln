import { CompleteProfileRequest, CreateProfileRequest, ProfileResponse, UserProfile } from '../models/auth.models';

const avatars: Record<string, string> = {
  peach: 'avatar-1', mint: 'avatar-2', sky: 'avatar-3', rose: 'avatar-4', lavender: 'avatar-5'
};
export function toProfileRequest(profile: CreateProfileRequest): CompleteProfileRequest {
  return {
    firstName: profile.nombres.trim(), lastName: profile.apellidos.trim(),
    username: profile.username.normalize('NFKC').trim(), avatar: avatars[profile.avatar] ?? profile.avatar
  };
}
export function fromProfileResponse(profile: ProfileResponse): UserProfile {
  return {
    uid: profile.uid, email: profile.email, nombres: profile.firstName, apellidos: profile.lastName,
    username: profile.username, createdAt: profile.createdAt,
    avatar: Object.keys(avatars).find((key) => avatars[key] === profile.avatar) ?? profile.avatar
  };
}
