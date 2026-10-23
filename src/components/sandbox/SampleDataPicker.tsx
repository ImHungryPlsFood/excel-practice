import { Button } from '@/components/ui/Button';
import { SAMPLE_DATASETS, type SampleDataset } from '@/content/sandbox/sampleDatasets';

/*
 * 연습실 샘플 데이터 선택 (CARD-02D, R-04.46).
 * 고른 샘플은 지금 보고 있는 시트에 불러온다. 시트의 기존 내용은 실행 취소로 되돌릴 수 있다.
 */

interface SampleDataPickerProps {
  /** 불러올 시트 이름(안내 문장용) */
  sheetName: string;
  onLoad: (dataset: SampleDataset) => void;
}

export function SampleDataPicker({ sheetName, onLoad }: SampleDataPickerProps) {
  return (
    <section aria-label="샘플 데이터" className="flex flex-col gap-2">
      <p className="text-sm text-fg-secondary">
        모든 샘플은 연습용으로 만든 가상 데이터입니다. 고른 샘플은 지금 보고 있는{' '}
        <strong className="font-semibold text-fg">{sheetName}</strong> 시트에 들어가며, 이 시트의
        원래 내용은 실행 취소(Ctrl+Z)로 되돌릴 수 있습니다.
      </p>
      <ul className="grid gap-2 sm:grid-cols-3">
        {SAMPLE_DATASETS.map((dataset) => (
          <li
            key={dataset.id}
            className="flex flex-col gap-2 rounded-md border border-line bg-surface p-3"
          >
            <h3 className="text-sm font-semibold text-fg">{dataset.title}</h3>
            <p className="flex-1 text-xs text-fg-secondary">{dataset.description}</p>
            <Button
              variant="secondary"
              size="sm"
              aria-label={`${dataset.title} 불러오기`}
              onClick={() => onLoad(dataset)}
              className="self-start"
            >
              불러오기
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
