import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { termsText, privacyText } from '@/data/Legal'
type Props = {
  type: 'terms' | 'privacy' | null
  onClose: () => void
}

export default function LegalConfirmModal({ type, onClose }: Props) {
  if (!type) return null

  const isTerms = type === 'terms'
  const title = isTerms ? 'Terms & Conditions' : 'Privacy Policy'
  const content = isTerms ? termsText : privacyText
 const pdfHref = isTerms
  ? '/TermsAndConditions.pdf'
  : '/PrivacyPolicy.pdf'


  return (
    <Dialog open={!!type} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* Scrollable legal text */}
        <div className="flex-1 overflow-y-auto whitespace-pre-wrap text-sm text-muted-foreground border rounded-md p-4">
          {content}
        </div>

        {/* Actions */}
        <div className="flex justify-between gap-2 pt-4">
          <a
            href={pdfHref}
            download
            className="text-primary underline text-sm"
          >
            Download as PDF
          </a>

          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
