import type { Metadata } from 'next';
import { Header } from '@/components/layout';
import { ImportContent } from '@/components/features/import';

export const metadata: Metadata = {
  title: 'Import',
  description: 'Import chat history from external services',
};

export default function ImportPage() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Header title="Import" />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
              <ImportContent />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
