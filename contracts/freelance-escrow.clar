;; freelance-escrow.clar

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-not-authorized (err u100))
(define-constant err-already-exists (err u101))
(define-constant err-not-found (err u102))
(define-constant err-invalid-state (err u103))
(define-constant err-insufficient-funds (err u104))

;; Data variables
(define-data-var next-escrow-id uint u0)

;; Escrow states
(define-data-var escrow-states (list 10 (string-ascii 20)) (list "CREATED" "FUNDED" "IN_PROGRESS" "COMPLETED" "DISPUTED" "RESOLVED" "CANCELLED"))

;; Maps
(define-map escrows
  { escrow-id: uint }
  {
    client: principal,
    freelancer: principal,
    amount: uint,
    state: (string-ascii 20),
    milestone-count: uint,
    completed-milestones: uint
  }
)

(define-map escrow-milestones
  { escrow-id: uint, milestone-id: uint }
  {
    description: (string-utf8 256),
    amount: uint,
    completed: bool
  }
)

;; Read-only functions
(define-read-only (get-escrow (escrow-id uint))
  (match (map-get? escrows { escrow-id: escrow-id })
    escrow (ok escrow)
    (err err-not-found)
  )
)

(define-read-only (get-milestone (escrow-id uint) (milestone-id uint))
  (match (map-get? escrow-milestones { escrow-id: escrow-id, milestone-id: milestone-id })
    milestone (ok milestone)
    (err err-not-found)
  )
)

;; Public functions
(define-public (create-escrow (freelancer principal) (total-amount uint) (milestone-count uint))
  (let
    (
      (escrow-id (var-get next-escrow-id))
      (client tx-sender)
    )
    (asserts! (> milestone-count u0) (err err-invalid-state))
    (asserts! (> total-amount u0) (err err-invalid-state))
    (match (stx-transfer? total-amount client (as-contract tx-sender))
      success
        (begin
          (map-set escrows
            { escrow-id: escrow-id }
            {
              client: client,
              freelancer: freelancer,
              amount: total-amount,
              state: "CREATED",
              milestone-count: milestone-count,
              completed-milestones: u0
            }
          )
          (var-set next-escrow-id (+ escrow-id u1))
          (ok escrow-id)
        )
      error (err err-insufficient-funds)
    )
  )
)

