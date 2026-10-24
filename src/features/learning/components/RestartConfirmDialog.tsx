import { Button } from '@/components/ui/Button';

import { Dialog } from './Dialog';

/* 다시 시작 확인 (CARD-04C, R-09.25, R-09.26). 확인해야만 시트를 처음 상태로 돌리고, 그 뒤에도 실행 취소로 되찾을 수 있다. */
interface RestartConfirmDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export function RestartConfirmDialog({ onConfirm, onCancel }: RestartConfirmDialogProps) {
  return (
    <Dialog title="다시 시작" onClose={onCancel}>
      <h2 className="text-lg font-semibold">처음부터 다시 시작할까요?</h2>
      <p>
        작성한 내용이 시작 상태로 돌아갑니다. 시작한 뒤에도 <strong>실행 취소</strong>로 방금 작성한
        내용을 되찾을 수 있습니다. 열어 본 힌트와 제출 기록은 그대로 둡니다.
      </p>
      <div className="flex justify-end gap-2">
        <Button data-autofocus variant="secondary" onClick={onCancel}>
          취소
        </Button>
        <Button onClick={onConfirm}>다시 시작</Button>
      </div>
    </Dialog>
  );
}
