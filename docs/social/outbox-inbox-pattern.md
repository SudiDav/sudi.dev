# Outbox and inbox pattern: social posts

Image for all of these: public/images/blog/outbox-inbox-cover.png (from the Figma Covers page). The diagram is public/images/blog/outbox-inbox-pattern.png.
Post link: https://sudi.dev/blog/outbox-and-inbox-pattern-dotnet-ef-core-postgres

---

## LinkedIn

A lot of .NET code saves an order and then publishes an event, like this:

db.Orders.Add(order);
await db.SaveChangesAsync();
await bus.PublishAsync(new OrderPlaced(...));

The tests pass. But if the pod restarts or the broker is down right after SaveChangesAsync, the order is saved and the event is gone. The customer is never invoiced, and nothing in the logs says why.

Swap the two lines and the bug flips. The event goes out, the save fails, and another service starts working on an order that does not exist.

The fix is two small tables in PostgreSQL.

The outbox table holds the event. You save it in the same transaction as the order, so either both rows exist or neither does.

A background job sends the pending rows to the broker. It selects them with FOR UPDATE SKIP LOCKED, so three API instances never send the same row twice.

The inbox table protects the consumer. Before doing any work, the consumer inserts the message ID with ON CONFLICT DO NOTHING. If the insert affects 0 rows, the message was already handled and the consumer skips it.

I built this in .NET 10 with EF Core 10 and PostgreSQL 17, then forced one message to be delivered twice. Three orders produced three invoices, and the logs showed "Duplicate ignored" once.

The full walkthrough with all the code is on my blog. Link in the first comment.

#dotnet #efcore #postgresql #distributedsystems #softwarearchitecture

### First comment

Full post with the publisher code, the consumer code and a production checklist: https://sudi.dev/blog/outbox-and-inbox-pattern-dotnet-ef-core-postgres

I publish one practical .NET post like this every week. If you want the next one in your inbox, the newsletter signup is on sudi.dev/blog.

---

## X (thread)

1/
A lot of .NET code does this:

SaveChangesAsync();
PublishAsync(orderPlaced);

If the pod restarts between those two lines, the order is saved and the event is gone. No exception, no log line.

Here is how I fix it in .NET 10 with EF Core and Postgres.

2/
This is the dual write problem. You write to the database and to the broker, and no transaction covers both.

The outbox fixes it. Save the event to a table in the same transaction as the order. One SaveChanges, so both rows exist or neither does.

3/
A background job sends the pending rows:

SELECT ... FOR UPDATE SKIP LOCKED

Each API instance locks the rows it picked, and the other instances skip them. You get no duplicate sends when you scale out, and you don't need a distributed lock.

4/
The publisher sends, marks the row, then commits. If it crashes before the commit, the row goes out again.

So the outbox gives you at-least-once delivery, not exactly-once. The consumer has to handle duplicates.

5/
The inbox handles them. Before doing any work, the consumer runs

INSERT INTO inbox_messages ... ON CONFLICT DO NOTHING

0 rows affected means the message was already handled, so it skips it. The inbox row and the real work commit together.

6/
I tested it by forcing a duplicate delivery. 3 orders produced 3 invoices, and the log showed one "Duplicate ignored".

Full code and a production checklist:
https://sudi.dev/blog/outbox-and-inbox-pattern-dotnet-ef-core-postgres

7/
I publish one practical .NET post a week, with working code and the bugs I hit while testing it.

Want the next one in your inbox? Subscribe at https://sudi.dev/blog

---

## Newsletter call-to-action options

Use any of these at the end of a post, in a first comment, or in an X reply.

- I publish one practical .NET post like this every week, with working code and the bugs I hit while testing it. If you want the next one in your inbox, join the newsletter.
- Tests rarely catch this kind of bug. Production does. One email a week shows you the fix before you need it.
- If this post saves you one production incident, the newsletter will save you a few more. One practical .NET post a week.
- Get one real .NET production fix in your inbox every week, with code you can copy.
