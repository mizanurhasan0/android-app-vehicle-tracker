# Student transport shifts and weekly travel days

A student has one shared identity and can hold separate transport services in different shifts. Each service has its own route, start/end points, vehicle assignment, monthly fare and selected travel days. The vehicle's assigned driver continues to supply the driver for that service.

## Using the app

1. In admin **Settings → Transport shifts and weekdays**, select the institution's operating weekdays and configure shift names, departure times and return times. Additional shifts can be added.
2. Create a student or admission application. Select a shift and the days the student travels. New services initially select the institution's operating days.
3. To add another shift, open the existing student's profile and select **Add service in another shift**. Guardian admission also allows selecting an existing student, including one with a pending or rejected application.
4. The same student cannot hold another pending request or active service in the same shift, even on another route or on different weekdays. Different shifts are allowed. Overlapping shift times on shared travel days produce a warning.
5. Attendance can be filtered by date, vehicle and shift. Only active services scheduled on that date are eligible. The institution's closed days override a service's selected days, and unscheduled days are not absences.
6. Route details show today's passengers, with a shift filter. The parent's journey screen identifies the student and shift and shows an explicit off-day state. Bills, payment selection and receipts identify the shift.

There is no separate driver login role in this app. The passenger list is available in route details to users whose existing permissions allow that route.

## API contract and compatibility

- `studentId` is the shared student identity. Select it when adding another service; never create a duplicate student profile to represent another shift.
- Existing `id` / `subscriptionId` values remain service/enrollment identities. Billing, attendance, stop requests and tracking keep their existing links. The attendance endpoint's `studentId` field continues to reference that service ID.
- `shiftId` identifies a configured shift; default IDs are `MORNING`, `DAY`, and `EVENING`.
- `operatingDays` is a nonempty array of unique weekday numbers, `0` (Sunday) through `6` (Saturday).
- Institution configuration is stored in settings as `operatingDays` and `transportShifts` (`id`, `name`, `startTime`, `endTime`). Times use 24-hour `HH:mm`, with return after departure on the same day.
- Management overview retains all permitted student services for profile management and additionally provides `today`, `todayStudents` and each service's `scheduledToday`.
- Migration 4 preserves existing enrollment IDs, bills and attendance. Existing services retain all seven travel days under the default morning shift; existing installations retain their previous all-week institution behavior until an administrator configures off days. Fresh installations default to Friday off.

The weekly-day selection controls scheduling and attendance; it does not automatically prorate the existing monthly fare. Each service continues to use its assigned monthly fare and bill record.

Deploy the updated API (with a database backup and migration verification) before distributing the updated Android app. This code change does not publish either component automatically.
