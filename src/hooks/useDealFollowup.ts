import { useMutation } from '@tanstack/react-query';
import { draftDealFollowup } from '../api/dealFollowup';

export function useDraftDealFollowup() {
  return useMutation({ mutationFn: draftDealFollowup });
}
