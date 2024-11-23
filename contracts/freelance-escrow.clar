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

(define-public (add-milestone (escrow-id uint) (milestone-id uint) (description (string-utf8 256)) (amount uint))
  (let
    (
      (escrow (unwrap! (get-escrow escrow-id) (err err-not-found)))
    )
    (asserts! (is-eq tx-sender (get client escrow)) (err err-not-authorized))
    (asserts! (is-eq (get state escrow) "CREATED") (err err-invalid-state))
    (asserts! (< milestone-id (get milestone-count escrow)) (err err-invalid-state))
    (map-set escrow-milestones
      { escrow-id: escrow-id, milestone-id: milestone-id }
      {
        description: description,
        amount: amount,
        completed: false
      }
    )
    (ok true)
  )
)

(define-public (start-escrow (escrow-id uint))
  (let
    (
      (escrow (unwrap! (get-escrow escrow-id) (err err-not-found)))
    )
    (asserts! (is-eq tx-sender (get client escrow)) (err err-not-authorized))
    (asserts! (is-eq (get state escrow) "CREATED") (err err-invalid-state))
    (map-set escrows
      { escrow-id: escrow-id }
      (merge escrow { state: "IN_PROGRESS" })
    )
    (ok true)
  )
)

(define-public (complete-milestone (escrow-id uint) (milestone-id uint))
  (let
    (
      (escrow (unwrap! (get-escrow escrow-id) (err err-not-found)))
      (milestone (unwrap! (get-milestone escrow-id milestone-id) (err err-not-found)))
    )
    (asserts! (is-eq tx-sender (get freelancer escrow)) (err err-not-authorized))
    (asserts! (is-eq (get state escrow) "IN_PROGRESS") (err err-invalid-state))
    (asserts! (not (get completed milestone)) (err err-invalid-state))
    (map-set escrow-milestones
      { escrow-id: escrow-id, milestone-id: milestone-id }
      (merge milestone { completed: true })
    )
    (map-set escrows
      { escrow-id: escrow-id }
      (merge escrow { completed-milestones: (+ (get completed-milestones escrow) u1) })
    )
    (ok true)
  )
)

(define-public (release-funds (escrow-id uint))
  (let
    (
      (escrow (unwrap! (get-escrow escrow-id) (err err-not-found)))
    )
    (asserts! (is-eq tx-sender (get client escrow)) (err err-not-authorized))
    (asserts! (is-eq (get state escrow) "IN_PROGRESS") (err err-invalid-state))
    (asserts! (is-eq (get completed-milestones escrow) (get milestone-count escrow)) (err err-invalid-state))
    (match (as-contract (stx-transfer? (get amount escrow) tx-sender (get freelancer escrow)))
      success
        (begin
          (map-set escrows
            { escrow-id: escrow-id }
            (merge escrow { state: "COMPLETED" })
          )
          (ok true)
        )
      error (err err-insufficient-funds)
    )
  )
)

(define-public (initiate-dispute (escrow-id uint))
  (let
    (
      (escrow (unwrap! (get-escrow escrow-id) (err err-not-found)))
    )
    (asserts! (or (is-eq tx-sender (get client escrow)) (is-eq tx-sender (get freelancer escrow))) (err err-not-authorized))
    (asserts! (is-eq (get state escrow) "IN_PROGRESS") (err err-invalid-state))
    (map-set escrows
      { escrow-id: escrow-id }
      (merge escrow { state: "DISPUTED" })
    )
    (ok true)
  )
)

(define-public (resolve-dispute (escrow-id uint) (client-share uint) (freelancer-share uint))
  (let
    (
      (escrow (unwrap! (get-escrow escrow-id) (err err-not-found)))
    )
    (asserts! (is-eq tx-sender contract-owner) (err err-not-authorized))
    (asserts! (is-eq (get state escrow) "DISPUTED") (err err-invalid-state))
    (asserts! (is-eq (+ client-share freelancer-share) (get amount escrow)) (err err-invalid-state))
    (match (as-contract (stx-transfer? client-share tx-sender (get client escrow)))
      success-client
        (match (as-contract (stx-transfer? freelancer-share tx-sender (get freelancer escrow)))
          success-freelancer
            (begin
              (map-set escrows
                { escrow-id: escrow-id }
                (merge escrow { state: "RESOLVED" })
              )
              (ok true)
            )
          error-freelancer (err err-insufficient-funds)
        )
      error-client (err err-insufficient-funds)
    )
  )
)

(define-public (cancel-escrow (escrow-id uint))
  (let
    (
      (escrow (unwrap! (get-escrow escrow-id) (err err-not-found)))
    )
    (asserts! (is-eq tx-sender (get client escrow)) (err err-not-authorized))
    (asserts! (is-eq (get state escrow) "CREATED") (err err-invalid-state))
    (match (as-contract (stx-transfer? (get amount escrow) tx-sender (get client escrow)))
      success
        (begin
          (map-set escrows
            { escrow-id: escrow-id }
            (merge escrow { state: "CANCELLED" })
          )
          (ok true)
        )
      error (err err-insufficient-funds)
    )
  )
)
