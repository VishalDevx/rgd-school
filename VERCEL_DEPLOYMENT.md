# Vercel Deployment Guide

## ✅ Build Status
**Build Successful** - All errors fixed and ready for deployment!

## Required Environment Variables

Set these in your Vercel project settings:

### Database
- `MONGODB_URI` - MongoDB Atlas connection string, e.g.
  `mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/rgd_school?appName=Cluster0`

### Authentication
- `NEXTAUTH_SECRET` - Strong random secret (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL` - Your Vercel deployment URL (e.g., `https://your-app.vercel.app`)

### Supabase (for file uploads)
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

### Vercel Cron Jobs
- `CRON_SECRET` or `CRON_SECRET_TOKEN` - Secret token for cron job authentication

### Upstash Redis (for rate limiting)
- `UPSTASH_REDIS_REST_URL` - Upstash Redis REST URL
- `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis REST token

## Deployment Steps

1. **Push to GitHub/GitLab**
   ```bash
   git add .
   git commit -m "Ready for Vercel deployment"
   git push
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your repository
   - Vercel will auto-detect Next.js

3. **Set Environment Variables**
   - Add all variables listed above in Vercel dashboard
   - Under Settings → Environment Variables

4. **Create Collections and Indexes**
   MongoDB has no migration step. Build the collections/indexes once by running
   the seed (or just the index sync) against the production cluster:
   ```bash
   # pull the production env first
   vercel env pull .env.local
   npm run seed        # wipes and reseeds all collections
   ```
   To only create indexes and leave existing data untouched, run a small script
   that calls `db.syncIndexes()` (see `db.syncIndexes` in `lib/db.ts`).

5. **Deploy**
   - Vercel will automatically build and deploy
   - Check build logs for any issues

## Post-Deployment

1. **Verify Database Connection**
   - Check that the app can reach MongoDB (`MONGODB_URI` correct, Atlas IP
     access list allows Vercel's egress — `0.0.0.0/0` or Vercel's published ranges)

2. **Test Authentication**
   - Try logging in as admin/staff/student

3. **Verify Cron Jobs**
   - Check Vercel Cron dashboard for scheduled jobs
   - Test `/api/cron/promote-students` endpoint

4. **Test Image Uploads**
   - Upload images via admin settings
   - Verify they appear on the website

## Build Configuration

- **Framework**: Next.js 15.5.9
- **Node Version**: 18+ (set in `package.json` if needed)
- **Build Command**: `npm run build` (auto-detected)
- **Output Directory**: `.next` (auto-detected)
- **Install Command**: `npm install`

## Important Notes

- There is no Prisma/migration step; schemas are Mongoose models in `models/`
- Money is stored as a double and rounded in code (`lib/money.ts`)
- The Atlas free tier (M0) has no replica set, so multi-document transactions are
  unavailable — multi-write routes use compensating deletes instead of `db.$transaction`
- Image uploads require Supabase storage bucket named `rgd-school`
- Rate limiting requires Upstash Redis (free tier available)

## Troubleshooting

### Build Fails
- Check environment variables are set correctly
- Verify `MONGODB_URI` is accessible from Vercel
- Check build logs for specific errors

### Database Connection Issues
- Verify `MONGODB_URI` is correct (and that the password is URL-encoded)
- Check the Atlas IP access list allows Vercel's egress IPs
- Confirm the database name in the URI matches your target database
- If you see "still contains the literal <db_password>", the env var was never filled in

### Image Upload Issues
- Verify Supabase bucket `rgd-school` exists
- Check `SUPABASE_SERVICE_ROLE_KEY` has correct permissions
- Verify bucket is public or CORS is configured

### Cron Jobs Not Running
- Check `CRON_SECRET` is set in environment variables
- Verify cron schedule in `vercel.json`
- Check Vercel Cron dashboard for execution logs
