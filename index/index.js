import { mountFooter } from '/src/components/footer/footer.js';
import { mountHeader } from '/src/components/header/header.js';
import { toPostRoute } from '/src/router/router.js';
import { requireSupabase } from '/src/lib/supabaseClient.js';

mountHeader('#app-header');
mountFooter('#app-footer');

const HERO_PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1800&q=80';
const CARD_PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1526481280695-3c4691f5e66c?auto=format&fit=crop&w=1200&q=80';

const featuredLoading = document.querySelector('#featured-loading');
const featuredEmpty = document.querySelector('#featured-empty');
const featuredCarouselWrapper = document.querySelector('#featured-carousel-wrapper');
const featuredIndicators = document.querySelector('#featured-carousel-indicators');
const featuredInner = document.querySelector('#featured-carousel-inner');
const featuredCarouselElement = document.querySelector('#featured-carousel');

const countrySearch = document.querySelector('#countrySearch');
const postsLoading = document.querySelector('#posts-loading');
const postsContainer = document.querySelector('#postsContainer');
const heroSeePostsButton = document.querySelector('#hero-see-posts-button');
const countryPostsTitle = document.querySelector('#country-posts-title');

let allPosts = [];

function setHeroBackground() {
	const heroSection = document.querySelector('.hero-section');
	if (!heroSection) {
		return;
	}

	heroSection.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.45)), url(${HERO_PLACEHOLDER_IMAGE})`;
}

function showAlert(target, message, variant = 'warning') {
	if (!target) {
		return;
	}

	target.className = `alert alert-${variant} mb-3`;
	target.textContent = message;
	target.classList.remove('d-none');
}

function hideElement(element) {
	if (element) {
		element.classList.add('d-none');
	}
}

function normalizeCountryName(post) {
	if (!post?.countries) {
		return 'Unknown Country';
	}

	if (Array.isArray(post.countries)) {
		return post.countries[0]?.name || 'Unknown Country';
	}

	return post.countries.name || 'Unknown Country';
}

function createFeaturedSlide(post, index) {
	const indicator = document.createElement('button');
	indicator.type = 'button';
	indicator.setAttribute('data-bs-target', '#featured-carousel');
	indicator.setAttribute('data-bs-slide-to', String(index));
	indicator.setAttribute('aria-label', `Slide ${index + 1}`);

	if (index === 0) {
		indicator.classList.add('active');
		indicator.setAttribute('aria-current', 'true');
	}

	const item = document.createElement('article');
	item.className = `carousel-item ${index === 0 ? 'active' : ''}`;

	const slideImage = post.image_url || CARD_PLACEHOLDER_IMAGE;

	const slideBody = document.createElement('div');
	slideBody.className = 'featured-slide d-flex align-items-end';
	slideBody.style.backgroundImage = `linear-gradient(0deg, rgba(0,0,0,0.65) 15%, rgba(0,0,0,0.2) 70%), url(${slideImage})`;

	const caption = document.createElement('div');
	caption.className = 'carousel-caption text-start pb-4';

	const heading = document.createElement('h3');
	heading.className = 'h4';
	heading.textContent = post.title;

	const button = document.createElement('a');
	button.className = 'btn btn-warning';
	button.href = toPostRoute(post.id);
	button.textContent = 'Read Article';

	caption.append(heading, button);
	slideBody.appendChild(caption);
	item.appendChild(slideBody);

	return { indicator, item };
}

function renderFeaturedPosts(posts) {
	featuredIndicators.innerHTML = '';
	featuredInner.innerHTML = '';

	if (!posts.length) {
		showAlert(featuredEmpty, 'No featured posts available yet.', 'light');
		hideElement(featuredCarouselWrapper);
		return;
	}

	posts.forEach((post, index) => {
		const { indicator, item } = createFeaturedSlide(post, index);
		featuredIndicators.appendChild(indicator);
		featuredInner.appendChild(item);
	});

	if (posts.length === 1) {
		featuredCarouselElement.querySelectorAll('.carousel-control-prev, .carousel-control-next').forEach((control) => {
			control.classList.add('d-none');
		});
	}

	featuredCarouselWrapper.classList.remove('d-none');
}

function createPostCard(post) {
	const column = document.createElement('article');
	column.className = 'col';
	column.dataset.countryId = post.country_id;

	const card = document.createElement('div');
	card.className = 'card h-100 shadow-sm';

	const image = document.createElement('img');
	image.src = post.image_url || CARD_PLACEHOLDER_IMAGE;
	image.className = 'card-img-top post-card-image';
	image.alt = post.title;

	const body = document.createElement('div');
	body.className = 'card-body d-flex flex-column';

	const countryBadge = document.createElement('span');
	countryBadge.className = 'badge text-bg-light border mb-2 align-self-start';
	countryBadge.textContent = normalizeCountryName(post);

	const title = document.createElement('h3');
	title.className = 'h5 card-title';
	title.textContent = post.title;

	const link = document.createElement('a');
	link.className = 'btn btn-outline-primary mt-auto';
	link.href = toPostRoute(post.id);
	link.textContent = 'Read Full Post';

	body.append(countryBadge, title, link);
	card.append(image, body);
	column.appendChild(card);

	return column;
}

function renderPosts(postsArray) {
	postsContainer.innerHTML = '';

	if (!postsArray.length) {
		postsContainer.innerHTML = '<p class="text-muted">No posts found for this country.</p>';
		return;
	}

	postsArray.forEach((post) => {
		postsContainer.appendChild(createPostCard(post));
	});
}

async function fetchFeaturedPosts(supabase) {
	const { data, error } = await supabase
		.from('posts')
		.select('id, title, image_url, created_at')
		.eq('is_approved', true)
		.order('created_at', { ascending: false })
		.limit(3);

	if (error) {
		throw new Error(error.message);
	}

	return data || [];
}

async function fetchApprovedPosts(supabase) {
	const { data, error } = await supabase
		.from('posts')
		.select('id, title, image_url, country_id, created_at, countries(name)')
		.eq('is_approved', true)
		.order('created_at', { ascending: false });

	if (error) {
		throw new Error(error.message);
	}

	return data || [];
}

async function ensureAuthenticated(supabase) {
	const { data } = await supabase.auth.getSession();
	if (!data?.session) {
		window.location.replace('/login/index.html');
		return false;
	}

	return true;
}

async function initDashboard() {
	setHeroBackground();

	heroSeePostsButton?.addEventListener('click', (event) => {
		event.preventDefault();
		countryPostsTitle?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	});

	const supabase = requireSupabase();
	if (!supabase) {
		showAlert(featuredLoading, 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.', 'warning');
		showAlert(postsLoading, 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.', 'warning');
		return;
	}

	const isAuthenticated = await ensureAuthenticated(supabase);
	if (!isAuthenticated) {
		return;
	}

	try {
		const [featuredPosts, approvedPosts] = await Promise.all([
			fetchFeaturedPosts(supabase),
			fetchApprovedPosts(supabase)
		]);

		allPosts = approvedPosts;

		hideElement(featuredLoading);
		renderFeaturedPosts(featuredPosts);

		hideElement(postsLoading);
		renderPosts(allPosts);

		countrySearch?.addEventListener('input', (event) => {
			const searchTerm = event.target.value.toLowerCase();
			const filteredArray = allPosts.filter((post) => {
				const countryName = normalizeCountryName(post).toLowerCase();
				return countryName.includes(searchTerm);
			});

			renderPosts(filteredArray);
		});
	} catch (error) {
		hideElement(featuredCarouselWrapper);
		showAlert(featuredLoading, `Could not load featured posts: ${error.message}`, 'danger');
		showAlert(postsLoading, `Could not load posts: ${error.message}`, 'danger');
	}
}

initDashboard();
